import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [users, setUsers] = useState([]);
  const [problem, setProblem] = useState("");
  const [isHost, setIsHost] = useState(false);

  const [code, setCode] = useState("");
  const [inputData, setInputData] = useState("");
  const [output, setOutput] = useState("");
  const [verdict, setVerdict] = useState("");

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const socketRef = useRef(null);

  const joinRoom = () => {
    const socket = new WebSocket(
      `ws://localhost:8000/ws/${room}/${username}`
    );

    socketRef.current = socket;

    socket.onopen = () => setJoined(true);

    socket.onmessage = (event) => {
      if (event.data.startsWith("__USERS__:")) {
        const list = event.data.replace("__USERS__:", "").split(",");
        setUsers(list);
        setIsHost(list[0] === username);
      } else if (event.data.startsWith("__PROBLEM__:")) {
        setProblem(event.data.replace("__PROBLEM__:", ""));
      } else {
        setChat((prev) => [...prev, event.data]);
      }
    };
  };

  const runCode = async () => {
    const res = await fetch("http://localhost:8000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, input: inputData }),
    });

    const data = await res.json();
    setOutput(data.output);
    setVerdict("");
  };

  const submitCode = async () => {
    const res = await fetch("http://localhost:8000/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setVerdict(data.verdict);

    if (data.failed_input) {
      setOutput(
        `Failed on input: ${data.failed_input}
Expected: ${data.expected}
Got: ${data.got}`
      );
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current.send(`${username}: ${message}`);
    setMessage("");
  };

  const handleProblemChange = (e) => {
    const value = e.target.value;
    setProblem(value);
    socketRef.current.send(`__PROBLEM__:${value}`);
  };

  if (!joined) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded w-96 space-y-4">
          <h2 className="text-2xl text-center">🚀 Join CodeRoom</h2>

          <input
            placeholder="Username"
            className="w-full p-2 bg-gray-700 rounded"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            placeholder="Room Name"
            className="w-full p-2 bg-gray-700 rounded"
            onChange={(e) => setRoom(e.target.value)}
          />

          <button
            onClick={joinRoom}
            className="w-full bg-green-500 p-2 rounded"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex">

      <div className="w-2/3 flex flex-col p-4">
        <textarea
          value={problem}
          onChange={handleProblemChange}
          readOnly={!isHost}
          className="h-32 bg-gray-800 p-2 mb-2"
        />

        <Editor
          height="300px"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val)}
        />

        <textarea
          placeholder="Custom input"
          className="h-20 bg-gray-800 p-2 mt-2"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={runCode}
            className="bg-blue-500 px-4 py-2 rounded"
          >
            Run
          </button>

          <button
            onClick={submitCode}
            className="bg-purple-600 px-4 py-2 rounded"
          >
            Submit
          </button>
        </div>

        <div className="bg-black p-3 mt-2 flex-1 overflow-auto">
          <pre>{output}</pre>
        </div>

        {verdict && (
          <div className="mt-2 text-xl font-bold">
            {verdict}
          </div>
        )}
      </div>

      <div className="w-1/3 bg-gray-800 p-4 flex flex-col">
        <div className="flex-1 overflow-auto">
          {chat.map((msg, i) => (
            <div key={i} className="bg-gray-700 p-2 mb-2 rounded">
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
  );
}

export default App;