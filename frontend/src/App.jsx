import { useRef, useState } from "react";
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
        setMessages((prev) => [
          ...prev,
          `${data.user || "Anonymous"}: ${data.message}`,
        ]);
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

  // ================= JOIN SCREEN =================
  if (!joined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-xl w-96 shadow-xl border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🚀 Join CodeRoom
          </h1>

          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded-lg"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-2 mb-4 bg-gray-700 rounded-lg"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <button
            onClick={joinRoom}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-2 rounded-lg font-semibold shadow-md hover:scale-[1.02] transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // ================= MAIN SCREEN =================
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div>
          🚀 Room: <span className="text-green-400">{room}</span> | Online: {online}
        </div>
        <div>User: {username}</div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 w-full overflow-hidden">

        {/* LEFT - CODE SECTION */}
        <div className="flex flex-col flex-[2] p-5 gap-4">

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-black p-4 rounded-lg resize-none w-full border border-gray-700 shadow-inner text-sm"
          />

          <button
            onClick={runCode}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 py-2 rounded-lg font-semibold shadow-md hover:scale-[1.02] transition"
          >
            ▶ Run Code
          </button>

          <div className="bg-black p-4 rounded-lg h-32 overflow-auto border border-gray-700 text-sm">
            <pre>{output}</pre>
          </div>
        </div>

        {/* RIGHT - CHAT SECTION */}
        <div className="flex flex-col flex-1 border-l border-gray-700 p-5">

          <h2 className="text-lg font-semibold mb-3">💬 Live Chat</h2>

          <div className="flex-1 bg-gray-800 rounded-lg p-3 overflow-auto mb-3 border border-gray-700">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="mb-2 bg-gray-700 px-3 py-2 rounded-md text-sm"
              >
                {msg}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 p-2 bg-gray-700 rounded-lg"
              placeholder="Type message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 px-4 rounded-lg font-semibold hover:scale-[1.05] transition"
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