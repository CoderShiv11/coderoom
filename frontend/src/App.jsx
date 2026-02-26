import { useEffect, useRef, useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState("print('Hello Shivtej 🚀')");
  const [output, setOutput] = useState("");
  const [online, setOnline] = useState(0);

  const ws = useRef(null);

  const joinRoom = () => {
    if (!username || !room) return;

    ws.current = new WebSocket(
      `wss://coderoom-backend-muah.onrender.com/ws/${room}/${username}`
    );

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "chat") {
        setMessages((prev) => [...prev, `${data.user}: ${data.message}`]);
      }

      if (data.type === "online") {
        setOnline(data.count);
      }
    };

    setJoined(true);
  };

  const sendMessage = () => {
    if (!message) return;

    ws.current.send(
      JSON.stringify({
        type: "chat",
        message: message,
      })
    );

    setMessage("");
  };

  const runCode = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, {
        code: code,
      });

      setOutput(res.data.output);
    } catch (err) {
      setOutput("Error running code");
    }
  };

  if (!joined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl w-96 shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🚀 Join CodeRoom
          </h1>

          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-2 mb-4 bg-gray-700 rounded"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <button
            onClick={joinRoom}
            className="w-full bg-green-500 py-2 rounded font-semibold"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3 bg-gray-800">
        <div>
          🚀 Room: <span className="text-green-400">{room}</span> | Online: {online}
        </div>
        <div>User: {username}</div>
      </div>

      {/* Main Section */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDE - CODE */}
        <div className="w-2/3 flex flex-col p-4 gap-3">

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-black p-4 rounded resize-none"
          />

          <button
            onClick={runCode}
            className="bg-blue-500 py-2 rounded"
          >
            ▶ Run Code
          </button>

          <div className="bg-black p-4 rounded h-40 overflow-auto">
            <pre>{output}</pre>
          </div>
        </div>

        {/* RIGHT SIDE - CHAT */}
        <div className="w-1/3 flex flex-col border-l border-gray-700 p-4">

          <h2 className="text-lg font-semibold mb-3">💬 Live Chat</h2>

          <div className="flex-1 bg-gray-800 rounded p-3 overflow-auto mb-3">
            {messages.map((msg, i) => (
              <div key={i} className="mb-2">
                {msg}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 p-2 bg-gray-700 rounded"
              placeholder="Type message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 px-4 rounded"
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