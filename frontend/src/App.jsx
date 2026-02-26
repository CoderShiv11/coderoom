import { useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const ws = useRef(null);
  const [page, setPage] = useState("home");

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);
  const [chatInput, setChatInput] = useState("");

  const connectRoom = async (adminMode) => {
    const cleanUsername = username.trim();
    const cleanRoom = room.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanRoom || !cleanPassword) {
      alert("Fill all fields properly");
      return;
    }

    setUsername(cleanUsername);
    setRoom(cleanRoom);
    setPassword(cleanPassword);
    setIsAdmin(adminMode);

    // Wake backend (Render fix)
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

  if (page === "home") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="bg-gray-900 p-10 rounded-xl w-full max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold">🚀 CodeRoom</h1>
          <button onClick={() => setPage("create")}
            className="w-full py-3 bg-green-600 rounded">
            Create Room
          </button>
          <button onClick={() => setPage("join")}
            className="w-full py-3 bg-blue-600 rounded">
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (page === "create" || page === "join") {
    const isCreate = page === "create";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold text-center">
            {isCreate ? "Create Room" : "Join Room"}
          </h2>
          <input className="w-full p-3 bg-gray-800 rounded"
            placeholder="Name"
            onChange={(e) => setUsername(e.target.value)} />
          <input className="w-full p-3 bg-gray-800 rounded"
            placeholder="Room"
            onChange={(e) => setRoom(e.target.value)} />
          <input className="w-full p-3 bg-gray-800 rounded"
            placeholder="Password"
            type="password"
            onChange={(e) => setPassword(e.target.value)} />
          <button onClick={() => connectRoom(isCreate)}
            className="w-full py-3 bg-green-600 rounded">
            {isCreate ? "Create & Enter" : "Join"}
          </button>
          <button onClick={() => setPage("home")}
            className="w-full py-2 bg-gray-700 rounded">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>Room: {room} | 👥 {online}</div>
        <div>⏱ {timer}s</div>
      </div>

      <div className="h-96 border border-gray-800">
        <Editor height="100%" language="python"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v)} />
      </div>

      <button onClick={async () => {
        const res = await axios.post(`${BACKEND_URL}/run`, { code });
        setOutput(res.data.output);
      }}
        className="bg-blue-600 px-4 py-2 rounded">
        Run
      </button>

      <div className="bg-black p-3 h-24 overflow-auto">
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default App;