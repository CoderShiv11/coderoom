import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const API_BASE = "https://coderoom-backend-muah.onrender.com";
const WS_BASE = "wss://coderoom-backend-muah.onrender.com";

function App() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [code, setCode] = useState("print('Hello Shivtej 🚀')");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [online, setOnline] = useState(0);

  const socketRef = useRef(null);

  const joinRoom = () => {
    if (!name || !room) return alert("Enter name and room");

    const socket = new WebSocket(
      `${WS_BASE}/ws/${room}/${name}`
    );

    socket.onopen = () => {
      setJoined(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "chat") {
        setChat((prev) => [...prev, data]);
      }

      if (data.type === "online") {
        setOnline(data.count);
      }

      if (data.type === "code") {
        setCode(data.code);
      }
    };

    socket.onclose = () => {
      setJoined(false);
    };

    socketRef.current = socket;
  };

  const sendMessage = () => {
    if (!message) return;
    socketRef.current.send(
      JSON.stringify({
        type: "chat",
        message,
      })
    );
    setMessage("");
  };

  const runCode = async () => {
    const res = await fetch(`${API_BASE}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setOutput(data.output);
  };

  const updateCode = (newCode) => {
    setCode(newCode);
    socketRef.current?.send(
      JSON.stringify({
        type: "code",
        code: newCode,
      })
    );
  };

  if (!joined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-6 rounded w-80">
          <h2 className="text-xl mb-4">🚀 Join CodeRoom</h2>
          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded"
            placeholder="Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            className="w-full bg-green-500 p-2 rounded"
            onClick={joinRoom}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div className="flex justify-between p-3 bg-gray-800">
        <div>🚀 Room: {room} | Online: {online}</div>
        <div>User: {name}</div>
      </div>

      <div className="flex flex-1">
        {/* Editor Section */}
        <div className="flex-1 flex flex-col">
          <Editor
            height="60%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={updateCode}
          />

          <button
            className="bg-blue-500 p-2"
            onClick={runCode}
          >
            ▶ Run Code
          </button>

          <div className="bg-black p-2 flex-1 overflow-auto">
            <pre>{output}</pre>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-80 bg-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-700">
            💬 Live Chat
          </div>

          <div className="flex-1 overflow-auto p-2">
            {chat.map((msg, i) => (
              <div key={i} className="mb-2">
                <b>{msg.user}:</b> {msg.message}
              </div>
            ))}
          </div>

          <div className="flex p-2">
            <input
              className="flex-1 p-2 bg-gray-700 rounded"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message..."
            />
            <button
              className="ml-2 bg-green-500 px-4 rounded"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;