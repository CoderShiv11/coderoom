import { useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const ws = useRef(null);

  // Navigation
  const [page, setPage] = useState("home");

  // User Info
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Room Data
  const [problem, setProblem] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);

  // ================= CONNECT =================
  const connectRoom = async (adminMode) => {
    if (!username || !room || !password) {
      alert("Please fill all fields");
      return;
    }

    setIsAdmin(adminMode);

    ws.current = new WebSocket(
      `wss://coderoom-backend-muah.onrender.com/ws/${room}/${username}/${password}`
    );

    ws.current.onopen = () => {
      console.log("Connected");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "wrong_password") {
        alert("Wrong Password");
        return;
      }

      if (data.type === "room_full") {
        alert("Room is Full (Max 10 users)");
        return;
      }

      if (data.type === "online") {
        setOnline(data.count);
      }

      if (data.type === "chat") {
        setMessages((prev) => [...prev, `${data.user}: ${data.message}`]);
      }

      if (data.type === "leaderboard") {
        setLeaderboard(data.data);
      }

      if (data.type === "timer") {
        setTimer(data.time);
      }

      if (data.type === "room_ended") {
        alert("Room ended by admin");
        setPage("home");
      }
    };

    const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
    if (res.data.content) {
      setProblem(res.data.content);
    }

    setPage("room");
  };

  // ================= ACTIONS =================
  const sendMessage = () => {
    if (!chatInput) return;
    ws.current.send(JSON.stringify({ type: "chat", message: chatInput }));
    setChatInput("");
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
      answer: correctAnswer,
    });
  };

  const startTimer = () =>
    ws.current.send(JSON.stringify({ type: "start_timer" }));

  const stopTimer = () =>
    ws.current.send(JSON.stringify({ type: "stop_timer" }));

  const endRoom = () =>
    ws.current.send(JSON.stringify({ type: "end_room" }));

  // ================= HOME =================
  if (page === "home") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
        <div className="bg-gray-900 p-10 rounded-2xl w-full max-w-md border border-gray-800 shadow-xl text-center space-y-6">
          <h1 className="text-3xl font-bold">🚀 CodeRoom</h1>

          <button
            onClick={() => setPage("create")}
            className="w-full py-3 bg-green-600 rounded-lg hover:bg-green-700 transition"
          >
            Create Room
          </button>

          <button
            onClick={() => setPage("join")}
            className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // ================= CREATE / JOIN =================
  if (page === "create" || page === "join") {
    const isCreate = page === "create";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md border border-gray-800 shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-center">
            {isCreate ? "Create Room" : "Join Room"}
          </h2>

          <input
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />

          <input
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700"
            type="password"
            placeholder="Room Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={() => connectRoom(isCreate)}
            className={`w-full py-3 rounded-lg ${
              isCreate ? "bg-green-600" : "bg-blue-600"
            } hover:opacity-90 transition`}
          >
            {isCreate ? "Create & Enter" : "Join Room"}
          </button>

          <button
            onClick={() => setPage("home")}
            className="w-full py-2 bg-gray-700 rounded-lg"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ================= ROOM PAGE =================
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="text-lg font-semibold">
            Room: <span className="text-green-400">{room}</span>
          </div>

          <div className="flex items-center gap-4 mt-3 md:mt-0">
            <div className="bg-gray-800 px-3 py-1 rounded-full text-sm">
              👥 Online: {online}
            </div>
            <div className="bg-gray-800 px-3 py-1 rounded-full text-sm">
              ⏱ {timer}s
            </div>

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
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
          <h2 className="font-bold text-lg">Problem</h2>

          <textarea
            className="w-full h-28 bg-gray-800 p-3 rounded-lg border border-gray-700"
            value={problem}
            disabled={!isAdmin}
            onChange={(e) => setProblem(e.target.value)}
          />

          {isAdmin && (
            <>
              <input
                className="w-full bg-gray-800 p-3 rounded-lg border border-gray-700"
                placeholder="Correct Output"
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
              <button
                onClick={saveProblem}
                className="bg-purple-600 px-4 py-2 rounded-lg"
              >
                Save Problem
              </button>
            </>
          )}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* EDITOR */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[400px] border border-gray-800 rounded-xl overflow-hidden">
              <Editor
                height="100%"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={runCode}
                className="bg-blue-600 px-4 py-2 rounded-lg">
                Run
              </button>
              <button onClick={submitSolution}
                className="bg-green-600 px-4 py-2 rounded-lg">
                Submit
              </button>
            </div>

            <div className="bg-black p-3 rounded-lg h-32 overflow-auto border border-gray-800">
              <pre>{output}</pre>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">🏆 Leaderboard</h3>
              {leaderboard.map((u, i) => (
                <div key={i}>{u[0]} - {u[1]} pts</div>
              ))}
            </div>

            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 h-40 overflow-auto">
              <h3 className="font-bold mb-2">💬 Chat</h3>
              {messages.map((m, i) => (
                <div key={i}>{m}</div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 p-2 rounded-lg border border-gray-700"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 px-3 rounded-lg"
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