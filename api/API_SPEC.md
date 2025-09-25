API Spec
Socket.io Events
connection: New user joins chat

message: Broadcast user/AI message to all clients

disconnect: Remove user from active list

REST Endpoints
POST /api/ask-ai: { prompt } → { aiResponse }

GET /api/messages: List all chat messages

POST /api/message: Save new chat message