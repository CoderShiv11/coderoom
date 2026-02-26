import { useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [messages, setMessages] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [online, setOnline] = useState(0);
  const [message, setMessage] = useState("");

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

      if (data.type === "submission") {
        setSubmissions((prev) => [...prev, data.data]);
      }
    };

    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    setProblem(res.data.content);

    setJoined(true);
  };

  const sendMessage = () => {
    ws.current.send(JSON.stringify({ type: "chat", message }));
    setMessage("");
  };

  const runCode = async () => {
    const res = await axios.post(`${BACKEND_URL}/run`, { code });
    setOutput(res.data.output);
  };

  const submitSolution = () => {
    ws.current.send(JSON.stringify({ type: "submit", code }));
  };

  const saveProblem = async () => {
    await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
      content: problem,
    });
  };

  const deleteProblem = async () => {
    await axios.delete(`${BACKEND_URL}/delete-problem/${room}`);
    setProblem("");
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md border border-gray-800">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Join CodeRoom
          </h1>

          <input
            className="w-full p-3 mb-4 bg-gray-800 rounded text-white"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 mb-4 bg-gray-800 rounded text-white"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <label className="text-white text-sm mb-4 flex gap-2">
            <input type="checkbox" onChange={(e) => setIsAdmin(e.target.checked)} />
            Join as Admin
          </label>

          <button
            onClick={joinRoom}
            className="w-full bg-green-600 py-3 rounded text-white font-semibold"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex justify-center">
      <div className="w-full max-w-7xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            Room: <span className="text-green-400">{room}</span> | Online: {online}
          </div>
          <div>User: {username}</div>
        </div>

        {/* PROBLEM SECTION */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold mb-3">Problem</h2>

          <textarea
            className="w-full h-40 bg-gray-800 p-3 rounded text-white"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            disabled={!isAdmin}
          />

          {isAdmin && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={saveProblem}
                className="bg-purple-600 px-4 py-2 rounded"
              >
                Save
              </button>

              <button
                onClick={deleteProblem}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* EDITOR */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[400px] rounded-xl overflow-hidden border border-gray-800">
              <Editor
                height="100%"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={runCode}
                className="bg-blue-600 px-4 py-2 rounded"
              >
                Run
              </button>

              <button
                onClick={submitSolution}
                className="bg-green-600 px-4 py-2 rounded"
              >
                Submit
              </button>
            </div>

            <div className="bg-black p-3 rounded h-32 overflow-auto">
              <pre>{output}</pre>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-60 overflow-auto">
              <h3 className="font-bold mb-2">Live Chat</h3>
              {messages.map((msg, i) => (
                <div key={i} className="text-sm mb-1">{msg}</div>
              ))}
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-60 overflow-auto">
              <h3 className="font-bold mb-2">Submissions</h3>
              {submissions.map((sub, i) => (
                <div key={i} className="text-sm mb-3 border-b border-gray-700 pb-2">
                  <div className="text-green-400">{sub.user}</div>
                  <pre className="text-xs">{sub.code}</pre>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 p-2 rounded"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 px-3 rounded"
              >
                Send
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;