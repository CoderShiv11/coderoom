import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const ws = useRef(null);

  // Join States
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Core States
  const [problem, setProblem] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);

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

      if (data.type === "timer") {
        setTimer(data.time);
      }

      if (data.type === "room_ended") {
        alert("Room ended by admin.");
        setJoined(false);
      }

      if (data.type === "room_full") {
        alert("Room is full (Max 10 users).");
      }
    };

    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    if (res.data.content) {
      setProblem(res.data.content);
    }

    setJoined(true);
  };

  // ================= CHAT =================
  const sendMessage = () => {
    if (!chatInput) return;

    ws.current.send(
      JSON.stringify({
        type: "chat",
        message: chatInput,
      })
    );

    setChatInput("");
  };

  // ================= RUN =================
  const runCode = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, { code });
      setOutput(res.data.output);
    } catch {
      setOutput("Error running code");
    }
  };

  // ================= SUBMIT =================
  const submitSolution = () => {
    ws.current.send(
      JSON.stringify({
        type: "submit",
        code,
      })
    );
  };

  // ================= ADMIN CONTROLS =================
  const startTimer = () => {
    ws.current.send(JSON.stringify({ type: "start_timer" }));
  };

  const stopTimer = () => {
    ws.current.send(JSON.stringify({ type: "stop_timer" }));
  };

  const endRoom = () => {
    ws.current.send(JSON.stringify({ type: "end_room" }));
  };

  const saveProblem = async () => {
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
            className="w-full p-3 mb-4 bg-gray-800 rounded border border-gray-700"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 mb-4 bg-gray-800 rounded border border-gray-700"
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
            className="w-full py-3 rounded bg-green-600 hover:bg-green-700"
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

          <div className="flex items-center gap-4">
            <div>⏱ {timer}s</div>

            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={startTimer}
                  className="bg-green-600 px-3 py-1 rounded">
                  Start
                </button>
                <button onClick={stopTimer}
                  className="bg-yellow-600 px-3 py-1 rounded">
                  Stop
                </button>
                <button onClick={endRoom}
                  className="bg-red-600 px-3 py-1 rounded">
                  End
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PROBLEM */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="font-bold mb-3">Problem</h2>

          <textarea
            className="w-full h-32 bg-gray-800 p-3 rounded border border-gray-700"
            value={problem}
            disabled={!isAdmin}
            onChange={(e) => setProblem(e.target.value)}
          />

          {isAdmin && (
            <>
              <input
                className="w-full bg-gray-800 p-3 mt-3 rounded border border-gray-700"
                placeholder="Correct Output"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />

              <button
                onClick={saveProblem}
                className="bg-purple-600 px-4 py-2 mt-3 rounded"
              >
                Save Problem
              </button>
            </>
          )}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-4">

            <div className="h-[400px] rounded border border-gray-800 overflow-hidden">
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
                className="bg-blue-600 px-4 py-2 rounded">
                Run
              </button>

              <button
                onClick={submitSolution}
                className="bg-green-600 px-4 py-2 rounded">
                Submit
              </button>
            </div>

            <div className="bg-black p-3 rounded h-32 overflow-auto border border-gray-800">
              <pre>{output}</pre>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">

            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">🏆 Leaderboard</h3>
              {leaderboard.map((user, i) => (
                <div key={i}>
                  {user[0]} - {user[1]} pts
                </div>
              ))}
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">📤 Submissions</h3>
              {submissions.map((s, i) => (
                <div key={i}>
                  {s.user} - {s.correct ? "✅" : "❌"}
                </div>
              ))}
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">💬 Chat</h3>
              {messages.map((msg, i) => (
                <div key={i}>{msg}</div>
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
                className="bg-green-600 px-3 rounded">
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