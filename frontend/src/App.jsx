import { useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const ws = useRef(null);
  const [page, setPage] = useState("home");

  // User
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Room
  const [problem, setProblem] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [code, setCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [output, setOutput] = useState("");
  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);

  // ================= CONNECT =================
  const connectRoom = async (adminMode) => {
    const cleanUsername = username.trim();
    const cleanRoom = room.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanRoom || !cleanPassword) {
      alert("Fill all fields properly");
      return;
    }

    setIsAdmin(adminMode);

    await fetch(BACKEND_URL);

    ws.current = new WebSocket(
      `wss://coderoom-backend-muah.onrender.com/ws/${cleanRoom}/${cleanUsername}/${cleanPassword}/${adminMode}`
    );

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "wrong_password") return alert("Wrong password");
      if (data.type === "room_not_found") return alert("Room not found");
      if (data.type === "room_full") return alert("Room full");

      if (data.type === "online") setOnline(data.count);
      if (data.type === "chat")
        setMessages((prev) => [...prev, `${data.user}: ${data.message}`]);
      if (data.type === "leaderboard") setLeaderboard(data.data);
      if (data.type === "timer") setTimer(data.time);
      if (data.type === "room_ended") {
        alert("Room ended");
        setPage("home");
      }
    };

    const res = await axios.get(`${BACKEND_URL}/get-problem/${cleanRoom}`);
    if (res.data.content) setProblem(res.data.content);

    setPage("room");
  };

  // ================= ACTIONS =================
  const runCode = async () => {
    const res = await axios.post(`${BACKEND_URL}/run`, {
      code,
      user_input: userInput,
    });
    setOutput(res.data.output);
  };

  const refreshEditor = () => {
    setCode("");
    setOutput("");
  };

  const submitSolution = () => {
    ws.current.send(JSON.stringify({ type: "submit", code }));
  };

  const sendMessage = () => {
    if (!chatInput) return;
    ws.current.send(JSON.stringify({ type: "chat", message: chatInput }));
    setChatInput("");
  };

  const saveProblem = async () => {
    await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
      content: problem,
      answer: correctAnswer,
    });
    alert("Problem saved");
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white px-4">
        <div className="bg-gray-900/70 backdrop-blur-lg p-10 rounded-3xl w-full max-w-md space-y-6 shadow-2xl border border-gray-800 text-center">
          <h1 className="text-4xl font-extrabold tracking-wide">
            🚀 CodeRoom
          </h1>
          <button
            onClick={() => setPage("create")}
            className="w-full py-3 bg-indigo-600 rounded-xl hover:scale-105 transition"
          >
            Create Room
          </button>
          <button
            onClick={() => setPage("join")}
            className="w-full py-3 bg-purple-600 rounded-xl hover:scale-105 transition"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white px-4">
        <div className="bg-gray-900/70 backdrop-blur-lg p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl border border-gray-800">
          <h2 className="text-2xl font-bold text-center">
            {isCreate ? "Create Room" : "Join Room"}
          </h2>

          <input
            className="w-full p-3 bg-gray-800 rounded-xl"
            placeholder="Your Name"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full p-3 bg-gray-800 rounded-xl"
            placeholder="Room Name"
            onChange={(e) => setRoom(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-3 bg-gray-800 rounded-xl"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={() => connectRoom(isCreate)}
            className="w-full py-3 bg-indigo-600 rounded-xl hover:scale-105 transition"
          >
            {isCreate ? "Create & Enter" : "Join Room"}
          </button>

          <button
            onClick={() => setPage("home")}
            className="w-full py-2 bg-gray-700 rounded-xl"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ================= ROOM =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white flex">

      {/* SIDEBAR */}
      <div className="hidden md:flex flex-col w-60 bg-black/40 backdrop-blur-lg border-r border-gray-800 p-6 space-y-6">
        <h2 className="text-xl font-bold">Room Info</h2>
        <div>👤 {username}</div>
        <div>🏠 {room}</div>
        <div>👥 Online: {online}</div>
        <div>⏱ {timer}s</div>

        {isAdmin && (
          <div className="space-y-2">
            <button onClick={startTimer} className="w-full bg-green-600 py-2 rounded-lg">Start</button>
            <button onClick={stopTimer} className="w-full bg-yellow-600 py-2 rounded-lg">Stop</button>
            <button onClick={endRoom} className="w-full bg-red-600 py-2 rounded-lg">End</button>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6 space-y-6">

        {/* Problem */}
        <div className="bg-gray-900/70 backdrop-blur-lg p-5 rounded-2xl border border-gray-800">
          <h3 className="font-bold text-lg mb-3">Problem</h3>
          <textarea
            className="w-full h-24 bg-gray-800 p-3 rounded-xl"
            value={problem}
            disabled={!isAdmin}
            onChange={(e) => setProblem(e.target.value)}
          />
        </div>

        {/* Editor */}
        <div className="bg-gray-900/70 p-4 rounded-2xl border border-gray-800">
          <div className="h-96 rounded-xl overflow-hidden">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v)}
            />
          </div>
        </div>

        {/* Input */}
        <textarea
          className="w-full h-20 bg-gray-800 p-3 rounded-xl"
          placeholder="Custom Input"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />

        {/* Buttons */}
        <div className="flex flex-wrap gap-4">
          <button onClick={runCode} className="bg-indigo-600 px-6 py-2 rounded-xl hover:scale-105 transition">
            Run
          </button>
          <button onClick={submitSolution} className="bg-green-600 px-6 py-2 rounded-xl hover:scale-105 transition">
            Submit
          </button>
          <button onClick={refreshEditor} className="bg-gray-700 px-6 py-2 rounded-xl hover:scale-105 transition">
            Refresh
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="bg-purple-600 px-6 py-2 rounded-xl hover:scale-105 transition"
          >
            Chat
          </button>
        </div>

        {/* Output */}
        <div className="bg-black p-4 rounded-2xl h-32 overflow-auto border border-gray-800">
          <pre>{output}</pre>
        </div>
      </div>

      {/* FLOATING CHAT */}
      {showChat && (
        <div className="fixed bottom-5 right-5 w-80 bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-2xl">
          <h3 className="font-bold mb-2">💬 Chat</h3>
          <div className="h-40 overflow-auto mb-2">
            {messages.map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 p-2 rounded-lg"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button onClick={sendMessage} className="bg-indigo-600 px-3 rounded-lg">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;