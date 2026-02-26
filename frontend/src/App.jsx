import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const ws = useRef(null);

  // Auth / Room
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Core states
  const [problem, setProblem] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  const [messages, setMessages] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);
  const [chatInput, setChatInput] = useState("");

  // ================= TIMER =================
  useEffect(() => {
    let interval;
    if (joined) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [joined]);

  // ================= JOIN ROOM =================
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

      if (data.type === "submission") {
        setSubmissions((prev) => [...prev, data.data]);
      }

      if (data.type === "leaderboard") {
        setLeaderboard(data.data);
      }
    };

    // Load problem if exists
    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    if (res.data.content) {
      setProblem(res.data.content);
    }

    setJoined(true);
  };

  // ================= RUN CODE =================
  const runCode = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, { code });
      setOutput(res.data.output);
    } catch (err) {
      setOutput("Error running code");
    }
  };

  // ================= SUBMIT =================
  const submitSolution = () => {
    if (!code || !ws.current) return;

    ws.current.send(
      JSON.stringify({
        type: "submit",
        code,
      })
    );
  };

  // ================= CHAT =================
  const sendMessage = () => {
    if (!chatInput || !ws.current) return;

    ws.current.send(
      JSON.stringify({
        type: "chat",
        message: chatInput,
      })
    );

    setChatInput("");
  };

  // ================= ADMIN SAVE PROBLEM =================
  const saveProblem = async () => {
    if (!problem || !correctAnswer) return;

    await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
      content: problem,
      answer: correctAnswer,
    });
  };

  // ================= JOIN PAGE =================
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl text-white">
          <h1 className="text-2xl font-bold text-center mb-6">
            🚀 Join CodeRoom
          </h1>

          <input
            className="w-full p-3 mb-4 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 mb-4 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <label className="flex items-center gap-2 mb-5 text-sm">
            <input
              type="checkbox"
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            Join as Admin
          </label>

          <button
            onClick={joinRoom}
            className="w-full py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // ================= ROOM PAGE =================
  return (
    <div className="min-h-screen bg-gray-950 text-white flex justify-center">
      <div className="w-full max-w-7xl p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            Room: <span className="text-green-400">{room}</span> | Online: {online}
          </div>
          <div>⏱ Timer: {timer}s</div>
        </div>

        {/* PROBLEM SECTION */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-lg font-bold mb-3">Problem</h2>

          <textarea
            className="w-full h-40 bg-gray-800 p-3 rounded text-white border border-gray-700"
            value={problem}
            disabled={!isAdmin}
            onChange={(e) => setProblem(e.target.value)}
          />

          {isAdmin && (
            <div className="mt-3 space-y-3">
              <input
                className="w-full bg-gray-800 p-3 rounded border border-gray-700"
                placeholder="Correct Output"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />

              <button
                onClick={saveProblem}
                className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
              >
                Save Problem
              </button>
            </div>
          )}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE - EDITOR */}
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
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Run
              </button>

              <button
                onClick={submitSolution}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
              >
                Submit
              </button>
            </div>

            <div className="bg-black p-3 rounded h-32 overflow-auto border border-gray-800">
              <pre>{output}</pre>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            {/* LEADERBOARD */}
            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">🏆 Leaderboard</h3>
              {leaderboard.map((user, i) => (
                <div key={i} className="text-sm">
                  {user[0]} - {user[1]} pts
                </div>
              ))}
            </div>

            {/* SUBMISSIONS */}
            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">📤 Submissions</h3>
              {submissions.map((s, i) => (
                <div key={i} className="text-sm">
                  {s.user} - {s.correct ? "✅" : "❌"}
                </div>
              ))}
            </div>

            {/* CHAT */}
            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">💬 Chat</h3>
              {messages.map((msg, i) => (
                <div key={i} className="text-sm">{msg}</div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 p-2 rounded border border-gray-700"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 px-3 rounded hover:bg-green-700"
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