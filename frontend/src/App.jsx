import { useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { 
  FaUsers, 
  FaUser, 
  FaDoorOpen, 
  FaPaperPlane, 
  FaPlay, 
  FaCheck, 
  FaSave, 
  FaTrash, 
  FaComments,
  FaCode,
  FaTerminal,
  FaUserCircle,
  FaUserShield
} from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";

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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const joinRoom = async () => {
    if (!username || !room) return;
    setIsLoading(true);

    try {
      ws.current = new WebSocket(
        `wss://coderoom-backend-muah.onrender.com/ws/${room}/${username}`
      );

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "chat") {
          setMessages((prev) => [...prev, { 
            user: data.user, 
            message: data.message,
            time: new Date().toLocaleTimeString()
          }]);
          setTimeout(scrollToBottom, 100);
        }

        if (data.type === "online") {
          setOnline(data.count);
        }

        if (data.type === "submission") {
          setSubmissions((prev) => [data.data, ...prev]);
        }
      };

      const res = await axios.get(`${BACKEND_URL}/get-problem/${room}`);
      setProblem(res.data.content);
      setJoined(true);
    } catch (error) {
      console.error("Error joining room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    ws.current.send(JSON.stringify({ type: "chat", message }));
    setMessage("");
  };

  const runCode = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/run`, { code });
      setOutput(res.data.output);
    } catch (error) {
      setOutput("Error running code: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitSolution = () => {
    ws.current.send(JSON.stringify({ type: "submit", code }));
  };

  const saveProblem = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/set-problem/${room}`, {
        content: problem,
      });
    } catch (error) {
      console.error("Error saving problem:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProblem = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`${BACKEND_URL}/delete-problem/${room}`);
      setProblem("");
    } catch (error) {
      console.error("Error deleting problem:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl transform transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-r from-green-400 to-blue-500 p-3 rounded-xl">
              <FaCode className="text-3xl text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-8 text-center">
            Join CodeRoom
          </h1>

          <div className="space-y-4">
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                className="w-full p-3 pl-10 bg-gray-700/50 rounded-xl text-white border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                placeholder="Your Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative">
              <FaDoorOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                className="w-full p-3 pl-10 bg-gray-700/50 rounded-xl text-white border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                placeholder="Room Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 text-white p-3 bg-gray-700/30 rounded-xl cursor-pointer hover:bg-gray-700/50 transition-colors">
              <input 
                type="checkbox" 
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
              />
              <MdAdminPanelSettings className="text-xl text-purple-400" />
              <span>Join as Admin</span>
            </label>

            <button
              onClick={joinRoom}
              disabled={isLoading || !username || !room}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 py-3 rounded-xl text-white font-semibold hover:from-green-600 hover:to-blue-600 transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Joining...
                </>
              ) : (
                <>
                  <FaDoorOpen />
                  Join Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto p-4 lg:p-6">
        
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 mb-6 border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
              <FaDoorOpen className="text-green-400" />
              <span className="text-gray-300">Room:</span>
              <span className="font-semibold text-green-400">{room}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
              <FaUsers className="text-blue-400" />
              <span className="text-gray-300">Online:</span>
              <span className="font-semibold text-blue-400">{online}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="bg-purple-500/20 px-3 py-1 rounded-full text-purple-400 text-sm flex items-center gap-1">
                <FaUserShield />
                Admin
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-700/50 px-4 py-2 rounded-lg">
              <FaUserCircle className="text-xl text-gray-400" />
              <span className="font-semibold">{username}</span>
            </div>
          </div>
        </div>

        {/* Problem Section */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-gradient-to-b from-green-400 to-blue-500 rounded-full"></span>
            Problem Statement
          </h2>

          <textarea
            className="w-full h-40 bg-gray-700/50 p-4 rounded-lg text-white border border-gray-600 focus:border-green-500 focus:outline-none transition-colors resize-none"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            disabled={!isAdmin}
            placeholder={isAdmin ? "Enter problem description..." : "Problem description will appear here..."}
          />

          {isAdmin && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={saveProblem}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaSave />
                Save
              </button>

              <button
                onClick={deleteProblem}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaTrash />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Editor Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 overflow-hidden">
              <div className="h-[450px]">
                <Editor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={runCode}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaPlay className="text-sm" />
                Run Code
              </button>

              <button
                onClick={submitSolution}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaCheck />
                Submit Solution
              </button>
            </div>

            {/* Output Console */}
            <div className="bg-gray-900/80 backdrop-blur-lg rounded-xl border border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaTerminal className="text-gray-400" />
                <h3 className="font-semibold">Output Console</h3>
              </div>
              <pre className="bg-gray-950 p-4 rounded-lg h-32 overflow-auto text-sm font-mono">
                {output || "Run your code to see output..."}
              </pre>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Tabs for Mobile */}
            <div className="lg:hidden flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  activeTab === "chat" 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                <FaComments className="inline mr-2" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("submissions")}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                  activeTab === "submissions" 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                <FaCode className="inline mr-2" />
                Submissions
              </button>
            </div>

            {/* Chat Section */}
            <div className={`bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 p-4 ${
              activeTab !== "chat" && "hidden lg:block"
            }`}>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FaComments className="text-green-400" />
                Live Chat
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full ml-auto">
                  {online} online
                </span>
              </h3>
              
              <div className="h-64 overflow-auto mb-4 space-y-2 pr-2">
                {messages.map((msg, i) => (
                  <div key={i} className="bg-gray-700/30 p-2 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span className="font-semibold text-green-400">{msg.user}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 bg-gray-700/50 p-2 rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none transition-colors"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  className="bg-green-600 hover:bg-green-700 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>

            {/* Submissions Section */}
            <div className={`bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-700 p-4 ${
              activeTab !== "submissions" && "hidden lg:block"
            }`}>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FaCode className="text-blue-400" />
                Recent Submissions
              </h3>
              
              <div className="h-64 overflow-auto space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No submissions yet
                  </div>
                ) : (
                  submissions.map((sub, i) => (
                    <div key={i} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <FaUserCircle className="text-gray-400" />
                        <span className="font-semibold text-green-400">{sub.user}</span>
                      </div>
                      <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                        {sub.code}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;