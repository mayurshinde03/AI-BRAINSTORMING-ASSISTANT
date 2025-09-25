CREATE TABLE users (
id SERIAL PRIMARY KEY,
username VARCHAR(100) NOT NULL UNIQUE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
content TEXT NOT NULL,
is_ai_response BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON messages (user_id);
CREATE INDEX idx_created_at ON messages (created_at);