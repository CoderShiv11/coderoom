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
  const [problem, setProblem] = useState(null);

  const ws = useRef(null);

  const joinRoom = async () => {
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

    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    setProblem(res.data?.title ? res.data : null);

    setJoined(true);
  };

  const sendMessage = () => {
    if (!message || !ws.current) return;

    ws.current.send(JSON.stringify({ type: "chat", message }));
    setMessage("");
  };

  const runCode = async () => {
    const res = await axios.post(`${BACKEND_URL}/run`, { code });
    setOutput(res.data.output);
  };

  const setNewProblem = async () => {
    const title = prompt("Problem Title:");
    const description = prompt("Description:");
    const example = prompt("Example:");

    await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
      title,
      description,
      example,
    });

    setProblem({ title, description, example });
  };

  const deleteProblem = async () => {
    await axios.delete(`${BACKEND_URL}/delete-problem/${room}`);
    setProblem(null);
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-xl border border-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🚀 Join CodeRoom
          </h1>

          <input
            className="w-full p-3 mb-3 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 mb-3 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <label className="flex items-center gap-2 mb-4 text-sm">
            <input
              type="checkbox"
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            Join as Admin
          </label>

          <button
            onClick={joinRoom}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 bg-gray-900 border-b border-gray-800 gap-3">
        <div className="text-sm">
          Room: <span className="text-green-400 font-semibold">{room}</span> | Online: {online}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">User: {username}</span>

          {isAdmin && (
            <>
              <button
                onClick={setNewProblem}
                className="bg-purple-600 px-4 py-1 rounded-lg text-sm hover:bg-purple-700 transition"
              >
                Set Problem
              </button>

              {problem && (
                <button
                  onClick={deleteProblem}
                  className="bg-red-600 px-4 py-1 rounded-lg text-sm hover:bg-red-700 transition"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PROBLEM CARD */}
      {problem && (
        <div className="mx-6 mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-xl font-bold mb-2">{problem.title}</h2>
          <p className="text-sm text-gray-300 mb-3">{problem.description}</p>
          <pre className="bg-gray-800 p-3 rounded-lg text-sm overflow-auto">
{problem.example}
          </pre>
        </div>
      )}

      {/* MAIN */}
      <div className="flex flex-col lg:flex-row flex-1 px-6 py-6 gap-6">

        {/* EDITOR */}
        <div className="flex flex-col flex-1 gap-4">

          <div className="flex-1 min-h-[350px] border border-gray-800 rounded-xl overflow-hidden">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
              }}
            />
          </div>

          <button
            onClick={runCode}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            ▶ Run Code
          </button>

          <div className="h-32 bg-black p-3 rounded-lg border border-gray-800 overflow-auto text-sm">
            <pre>{output}</pre>
          </div>
        </div>

        {/* CHAT */}
        <div className="flex flex-col w-full lg:w-[350px] bg-gray-900 border border-gray-800 rounded-xl p-4">

          <h2 className="font-semibold mb-4">💬 Live Chat</h2>

          <div className="flex-1 overflow-auto mb-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className="bg-gray-800 p-2 rounded text-sm">
                {msg}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 p-2 bg-gray-800 rounded border border-gray-700 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type message..."
            />
            <button
              onClick={sendMessage}
              className="bg-green-500 px-4 rounded font-semibold hover:bg-green-600 transition"
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