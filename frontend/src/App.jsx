import { useRef, useState } from "react";
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
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");

  const [online, setOnline] = useState(0);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);

  // ================= CONNECT =================
  const connectRoom = async (adminMode) => {
    const cleanUsername = username.trim();
    const cleanRoom = room.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanRoom || !cleanPassword) {
      alert("Fill all fields");
      return;
    }

    setIsAdmin(adminMode);
    await fetch(BACKEND_URL);

    ws.current = new WebSocket(
      `wss://coderoom-backend-muah.onrender.com/ws/${cleanRoom}/${cleanUsername}/${cleanPassword}/${adminMode}`
    );

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "online") setOnline(data.count);
      if (data.type === "timer") setTimer(data.time);
      if (data.type === "leaderboard") setLeaderboard(data.data);

      if (data.type === "chat")
        setMessages((prev) => [...prev, `${data.user}: ${data.message}`]);

      if (data.type === "question") {
        setProblem(data.content);
        setQuestionIndex(data.index);
        setTotalQuestions(data.total);
        setCode("");
        setOutput("");
      }

      if (data.type === "room_ended") {
        alert("Room ended");
        setPage("home");
      }
    };

    setPage("room");
  };

  // ================= ADMIN =================
  const addQuestion = () => {
    if (!newQuestion || !newAnswer) return;
    ws.current.send(
      JSON.stringify({
        type: "add_question",
        content: newQuestion,
        answer: newAnswer,
      })
    );
    setNewQuestion("");
    setNewAnswer("");
  };

  const nextQuestion = () => {
    ws.current.send(JSON.stringify({ type: "next_question" }));
  };

  const startTimer = () =>
    ws.current.send(JSON.stringify({ type: "start_timer" }));
  const stopTimer = () =>
    ws.current.send(JSON.stringify({ type: "stop_timer" }));
  const endRoom = () =>
    ws.current.send(JSON.stringify({ type: "end_room" }));

  // ================= ACTIONS =================
  const runCode = async () => {
    const res = await fetch(`${BACKEND_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setOutput(data.output);
  };

  const submitSolution = () => {
    ws.current.send(JSON.stringify({ type: "submit", code }));
  };

  const refreshEditor = () => {
    setCode("");
    setOutput("");
  };

  const sendMessage = () => {
    if (!chatInput) return;
    ws.current.send(JSON.stringify({ type: "chat", message: chatInput }));
    setChatInput("");
  };

  // ================= HOME =================
  if (page === "home") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white">
        <div className="bg-gray-900/70 p-10 rounded-3xl w-full max-w-md space-y-6 text-center shadow-2xl">
          <h1 className="text-4xl font-bold">🚀 CodeRoom</h1>
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

  // ================= CREATE/JOIN =================
  if (page === "create" || page === "join") {
    const isCreate = page === "create";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white">
        <div className="bg-gray-900/70 p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl">
          <h2 className="text-2xl font-bold text-center">
            {isCreate ? "Create Room" : "Join Room"}
          </h2>

          <input
            className="w-full p-3 bg-gray-800 rounded-xl"
            placeholder="Name"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full p-3 bg-gray-800 rounded-xl"
            placeholder="Room"
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
            Enter Room
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
      <div className="hidden md:flex flex-col w-64 bg-black/40 p-6 space-y-6 border-r border-gray-800">
        <h2 className="text-xl font-bold">Room Info</h2>
        <div>👤 {username}</div>
        <div>🏠 {room}</div>
        <div>👥 {online}</div>
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

        {/* QUESTION HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Question {questionIndex} / {totalQuestions}
          </h2>

          <div className="flex gap-3">
            <button onClick={refreshEditor} className="bg-gray-700 px-4 py-2 rounded-xl">
              Refresh
            </button>
            <button onClick={() => setShowChat(!showChat)} className="bg-purple-600 px-4 py-2 rounded-xl">
              Chat
            </button>
          </div>
        </div>

        {/* PROBLEM */}
        <div className="bg-gray-900/70 p-5 rounded-2xl">
          <pre className="whitespace-pre-wrap">{problem}</pre>
        </div>

        {/* ADMIN ADD QUESTION */}
        {isAdmin && (
          <div className="bg-gray-900/70 p-5 rounded-2xl space-y-3">
            <textarea
              className="w-full p-3 bg-gray-800 rounded-xl"
              placeholder="New Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <input
              className="w-full p-3 bg-gray-800 rounded-xl"
              placeholder="Correct Answer"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={addQuestion} className="bg-indigo-600 px-4 py-2 rounded-xl">
                Add Question
              </button>
              <button onClick={nextQuestion} className="bg-blue-600 px-4 py-2 rounded-xl">
                Next Question
              </button>
            </div>
          </div>
        )}

        {/* EDITOR */}
        <div className="h-96 rounded-xl overflow-hidden">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v)}
          />
        </div>

        {/* BUTTONS */}
        <div className="flex gap-4">
          <button onClick={runCode} className="bg-indigo-600 px-6 py-2 rounded-xl">
            Run
          </button>
          <button onClick={submitSolution} className="bg-green-600 px-6 py-2 rounded-xl">
            Submit
          </button>
        </div>

        {/* OUTPUT */}
        <div className="bg-black p-4 rounded-2xl h-32 overflow-auto border border-gray-800">
          <pre>{output}</pre>
        </div>

        {/* LEADERBOARD */}
        <div className="bg-gray-900/70 p-5 rounded-2xl">
          <h3 className="font-bold mb-3">🏆 Leaderboard</h3>
          {leaderboard.map((u, i) => (
            <div key={i}>{u[0]} - {u[1]} pts</div>
          ))}
        </div>
      </div>

      {/* FLOATING CHAT */}
      {showChat && (
        <div className="fixed bottom-5 right-5 w-80 bg-gray-900 p-4 rounded-2xl shadow-2xl">
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