package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/cockroachdb/pebble"
)

var (
	ErrMessageNotFound = errors.New("encrypted message not found in rocksdb")
)

type EncryptedMessage struct {
	MessageID         string    `json:"message_id"`
	ChatID            string    `json:"chat_id"`
	SenderID          string    `json:"sender_id"`
	Timestamp         int64     `json:"timestamp"`
	Ciphertext        []byte    `json:"ciphertext"`
	Nonce             []byte    `json:"nonce"`
	AuthenticationTag []byte    `json:"authentication_tag"`
	CreatedAt         time.Time `json:"created_at"`
}

// RocksDBEngine wraps CockroachDB's pebble LSM-tree engine for encrypted message persistence.
type RocksDBEngine struct {
	db     *pebble.DB
	dbPath string
	logger *slog.Logger
}

// NewRocksDBEngine initializes the RocksDB storage engine at the specified path.
func NewRocksDBEngine(dbPath string, logger *slog.Logger) (*RocksDBEngine, error) {
	if logger == nil {
		logger = slog.Default()
	}

	if err := os.MkdirAll(dbPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create RocksDB directory: %w", err)
	}

	opts := &pebble.Options{
		MemTableSize:                64 * 1024 * 1024, // 64MB MemTable
		MemTableStopWritesThreshold: 4,
		L0CompactionThreshold:       4,
		L0StopWritesThreshold:       12,
	}

	db, err := pebble.Open(dbPath, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to open RocksDB engine: %w", err)
	}

	logger.Info("RocksDB message storage engine opened", slog.String("path", dbPath))

	return &RocksDBEngine{
		db:     db,
		dbPath: dbPath,
		logger: logger,
	}, nil
}

// FormatKey generates a lexicographically ordered RocksDB key.
// Format: chat:{chatID}:{19-digit Zero-Padded Timestamp}:{msgID}
func FormatKey(chatID string, timestamp int64, msgID string) []byte {
	return []byte(fmt.Sprintf("chat:%s:%019d:%s", chatID, timestamp, msgID))
}

// FormatPrefix generates the prefix key for scanning chat messages.
func FormatPrefix(chatID string) []byte {
	return []byte(fmt.Sprintf("chat:%s:", chatID))
}

// SaveEncryptedMessage writes the encrypted payload to WAL + MemTable in RocksDB.
func (s *RocksDBEngine) SaveEncryptedMessage(ctx context.Context, msgID, chatID, senderID string, ciphertext, nonce, authTag []byte) (*EncryptedMessage, error) {
	ts := time.Now().UnixNano()
	msg := &EncryptedMessage{
		MessageID:         msgID,
		ChatID:            chatID,
		SenderID:          senderID,
		Timestamp:         ts,
		Ciphertext:        ciphertext,
		Nonce:             nonce,
		AuthenticationTag: authTag,
		CreatedAt:         time.Now(),
	}

	key := FormatKey(chatID, ts, msgID)
	data, err := json.Marshal(msg)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal encrypted message: %w", err)
	}

	if err := s.db.Set(key, data, pebble.Sync); err != nil {
		return nil, fmt.Errorf("rocksdb Put failed: %w", err)
	}

	return msg, nil
}

// GetChatHistory fetches a paginated batch of encrypted messages for a chat ID.
func (s *RocksDBEngine) GetChatHistory(ctx context.Context, chatID string, limit int, cursor string, reverse bool) ([]*EncryptedMessage, string, error) {
	if limit <= 0 {
		limit = 50
	}

	prefix := FormatPrefix(chatID)
	prefixStr := string(prefix)
	upperBoundKey := []byte(fmt.Sprintf("chat:%s;\x00", chatID))

	iterOpts := &pebble.IterOptions{
		LowerBound: prefix,
		UpperBound: upperBoundKey,
	}

	iter, err := s.db.NewIter(iterOpts)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create RocksDB iterator: %w", err)
	}
	defer iter.Close()

	var messages []*EncryptedMessage
	var nextCursor string

	if reverse {
		if cursor != "" {
			iter.SeekLT([]byte(cursor))
		} else {
			iter.Last()
		}

		for iter.Valid() && len(messages) < limit {
			if !strings.HasPrefix(string(iter.Key()), prefixStr) {
				break
			}

			var msg EncryptedMessage
			if err := json.Unmarshal(iter.Value(), &msg); err == nil {
				messages = append(messages, &msg)
			}
			iter.Prev()
		}

		if iter.Valid() && strings.HasPrefix(string(iter.Key()), prefixStr) {
			nextCursor = string(iter.Key())
		}
	} else {
		if cursor != "" {
			iter.SeekGE([]byte(cursor))
		} else {
			iter.First()
		}

		for iter.Valid() && len(messages) < limit {
			if !strings.HasPrefix(string(iter.Key()), prefixStr) {
				break
			}

			var msg EncryptedMessage
			if err := json.Unmarshal(iter.Value(), &msg); err == nil {
				messages = append(messages, &msg)
			}
			iter.Next()
		}

		if iter.Valid() && strings.HasPrefix(string(iter.Key()), prefixStr) {
			nextCursor = string(iter.Key())
		}
	}

	return messages, nextCursor, nil
}

// DeleteMessage deletes a single encrypted message from RocksDB.
func (s *RocksDBEngine) DeleteMessage(ctx context.Context, chatID string, timestamp int64, msgID string) error {
	key := FormatKey(chatID, timestamp, msgID)
	return s.db.Delete(key, pebble.Sync)
}

// Close safely closes the RocksDB storage engine.
func (s *RocksDBEngine) Close() error {
	return s.db.Close()
}
