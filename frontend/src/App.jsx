import { useEffect, useRef, useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://coderoom-backend-muah.onrender.com";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [online, setOnline] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [resultStatus, setResultStatus] = useState("");

  const ws = useRef(null);

  // 🔥 Shared Problem
  const problem = {
    title: "Sum of Even Numbers",
    description:
      "You are given a number N. Print the sum of all even numbers from 1 to N (inclusive).",
    example: "Input: 10\nOutput: 30",
    expectedOutput: "30",
  };

  // ⏳ Timer
  useEffect(() => {
    if (!joined) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joined]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

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
          `${data.user}: ${data.message}`,
        ]);
      }

      if (data.type === "online") {
        setOnline(data.count);
      }
    };

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
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, {
        code: code,
      });

      setOutput(res.data.output);
      setResultStatus("");
    } catch {
      setOutput("Error running code");
    }
  };

  const submitCode = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, {
        code: code,
      });

      const result = res.data.output.trim();
      setOutput(result);

      if (result === problem.expectedOutput) {
        setResultStatus("✅ Correct Solution!");
      } else {
        setResultStatus("❌ Wrong Answer. Try Again.");
      }
    } catch {
      setOutput("Error running code");
    }
  };

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
            className="w-full bg-green-500 py-2 rounded-lg font-semibold"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">

      {/* Header */}
      <div className="flex justify-between items-center px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div>
          🚀 Room: <span className="text-green-400">{room}</span> | Online: {online}
        </div>
        <div className="flex gap-6 items-center">
          ⏳ {formatTime()}
          <span>User: {username}</span>
        </div>
      </div>

      {/* Problem Box */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-2">📘 {problem.title}</h2>
        <p className="text-sm mb-2">{problem.description}</p>
        <pre className="bg-gray-700 p-3 rounded text-sm">
{problem.example}
        </pre>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Code Section */}
        <div className="flex flex-col flex-[2] p-5 gap-4">

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-black p-4 rounded-lg resize-none border border-gray-700 text-sm"
            placeholder="Write your solution here..."
          />

          <div className="flex gap-3">
            <button
              onClick={runCode}
              className="flex-1 bg-blue-600 py-2 rounded-lg font-semibold"
            >
              ▶ Run Code
            </button>

            <button
              onClick={submitCode}
              className="flex-1 bg-purple-600 py-2 rounded-lg font-semibold"
            >
              🚀 Submit
            </button>
          </div>

          <div className="bg-black p-4 rounded-lg h-32 overflow-auto border border-gray-700 text-sm">
            <pre>{output}</pre>
          </div>

          {resultStatus && (
            <div className="text-lg font-semibold">
              {resultStatus}
            </div>
          )}
        </div>

        {/* Chat Section */}
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
              className="bg-green-500 px-4 rounded-lg font-semibold"
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