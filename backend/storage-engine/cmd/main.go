package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"storage-engine/internal/storage"
)

func main() {
	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger := slog.New(handler)
	slog.SetDefault(logger)

	logger.Info("Starting Go RocksDB Message Storage Microservice...")

	port := getEnv("STORAGE_PORT", "8081")
	dataDir := getEnv("ROCKSDB_PATH", filepath.Join(".", "data", "rocksdb"))

	// Initialize RocksDB Storage Engine
	rocksStore, err := storage.NewRocksDBEngine(dataDir, logger)
	if err != nil {
		logger.Error("Failed to initialize RocksDB engine", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer rocksStore.Close()

	mux := http.NewServeMux()

	// Health Check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "engine": "RocksDB/Pebble"})
	})

	// Save Encrypted Message
	mux.HandleFunc("/storage/messages", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var body struct {
				MessageID         string `json:"message_id"`
				ChatID            string `json:"chat_id"`
				SenderID          string `json:"sender_id"`
				Ciphertext        []byte `json:"ciphertext"`
				Nonce             []byte `json:"nonce"`
				AuthenticationTag []byte `json:"authentication_tag"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json payload"})
				return
			}

			msg, err := rocksStore.SaveEncryptedMessage(r.Context(), body.MessageID, body.ChatID, body.SenderID, body.Ciphertext, body.Nonce, body.AuthenticationTag)
			if err != nil {
				respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}

			respondJSON(w, http.StatusCreated, msg)
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	})

	// Get Chat Messages / Range Scan
	mux.HandleFunc("/storage/messages/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			chatID := strings.TrimPrefix(r.URL.Path, "/storage/messages/")
			if chatID == "" {
				respondJSON(w, http.StatusBadRequest, map[string]string{"error": "chat_id is required"})
				return
			}

			limitStr := r.URL.Query().Get("limit")
			limit := 50
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
			cursor := r.URL.Query().Get("cursor")

			messages, nextCursor, err := rocksStore.GetChatHistory(r.Context(), chatID, limit, cursor, true)
			if err != nil {
				respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}

			if messages == nil {
				messages = []*storage.EncryptedMessage{}
			}

			respondJSON(w, http.StatusOK, map[string]interface{}{
				"chat_id":     chatID,
				"messages":    messages,
				"next_cursor": nextCursor,
			})
			return
		}

		if r.Method == http.MethodDelete {
			// Delete message key: /storage/messages/{chatID}/{timestamp}/{msgID}
			parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/storage/messages/"), "/")
			if len(parts) != 3 {
				respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid path parameters, expected /storage/messages/{chatID}/{timestamp}/{msgID}"})
				return
			}
			chatID := parts[0]
			ts, err := strconv.ParseInt(parts[1], 10, 64)
			if err != nil {
				respondJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid timestamp"})
				return
			}
			msgID := parts[2]

			if err := rocksStore.DeleteMessage(r.Context(), chatID, ts, msgID); err != nil {
				respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}

			respondJSON(w, http.StatusOK, map[string]string{"message": "deleted successfully"})
			return
		}

		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info(fmt.Sprintf("Go RocksDB Storage Daemon listening on http://localhost:%s", port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Storage server failed", slog.String("error", err.Error()))
		}
	}()

	<-stop
	logger.Info("Shutting down Go RocksDB Storage Daemon...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	logger.Info("Storage Daemon closed cleanly.")
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
