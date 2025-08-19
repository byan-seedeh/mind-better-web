CREATE TABLE IF NOT EXISTS phq9_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_score TINYINT UNSIGNED NOT NULL CHECK (total_score <= 27),
  result_text VARCHAR(255) NOT NULL,
  recommended_action TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
