import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [online, setOnline] = useState(0);
  const [problem, setProblem] = useState({});

  const ws = useRef(null);

  const joinRoom = async () => {
    if (!username || !room) return;

    ws.current = new WebSocket(
      `wss://coderoom-backend-muah.onrender.com/ws/${room}/${username}`
    );

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "chat") {
        setMessages((prev) => [
          ...prev,
          `${data.user}: ${data.message}`,
        ]);
      }

      if (data.type === "online") {
        setOnline(data.count);
      }
    };

    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    setProblem(res.data);

    setJoined(true);
  };

  const sendMessage = () => {
    if (!message || !ws.current) return;

    ws.current.send(
      JSON.stringify({
        type: "chat",
        message: message,
      })
    );

    setMessage("");
  };

  const runCode = async () => {
    const res = await axios.post(`${BACKEND_URL}/run`, {
      code: code,
    });

    setOutput(res.data.output);
  };

  const setNewProblem = async () => {
    const title = prompt("Enter Problem Title:");
    const description = prompt("Enter Description:");
    const example = prompt("Enter Example:");

    await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
      title,
      description,
      example,
    });

    setProblem({ title, description, example });
  };

  if (!joined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-xl w-96">
          <h1 className="text-xl mb-4">🚀 Join CodeRoom</h1>

          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-2 mb-3 bg-gray-700 rounded"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            Join as Admin
          </label>

          <button
            onClick={joinRoom}
            className="w-full bg-green-500 py-2 rounded"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">

      <div className="flex justify-between p-4 bg-gray-800">
        <div>Room: {room} | Online: {online}</div>
        {isAdmin && (
          <button
            onClick={setNewProblem}
            className="bg-purple-600 px-3 py-1 rounded"
          >
            Set Problem
          </button>
        )}
      </div>

      {problem.title && (
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">{problem.title}</h2>
          <p>{problem.description}</p>
          <pre className="bg-gray-700 p-2 mt-2 rounded">
{problem.example}
          </pre>
        </div>
      )}

      <div className="flex flex-1">

        <div className="flex flex-col flex-[2] p-4 gap-3">
          <Editor
            height="400px"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value)}
          />

          <button
            onClick={runCode}
            className="bg-blue-600 py-2 rounded"
          >
            ▶ Run Code
          </button>

          <div className="bg-black p-3 h-32 overflow-auto rounded">
            <pre>{output}</pre>
          </div>
        </div>

        <div className="flex flex-col flex-1 border-l border-gray-700 p-4">
          <div className="flex-1 overflow-auto mb-3">
            {messages.map((msg, i) => (
              <div key={i} className="mb-2">
                {msg}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 p-2 bg-gray-700 rounded"
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