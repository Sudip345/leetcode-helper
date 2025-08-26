
const sendButton = document.getElementById("sendMessage");
const userinput = document.getElementById("userInput");

sendButton.disabled = userinput.value.trim() === "";

userinput.addEventListener("input", () => {
  userinput.style.height = "auto";
  userinput.style.height = Math.min(userinput.scrollHeight, 150) + "px";

  // Toggle send button
  sendButton.disabled = userinput.value.trim() === "";
});

// ===============================
// Utility: Add message to chat
// ===============================
function addMessage(text, sender = "bot") {
  const resultEl = document.querySelector(".result");
  const msg = document.createElement("div");
  msg.className = sender;
  msg.innerText = text;
  resultEl.appendChild(msg);

  // Auto scroll to bottom
  resultEl.scrollTop = resultEl.scrollHeight;

  // Save chat
  localStorage.setItem("chat", resultEl.innerHTML);
}

// ===============================
// Restore chat + check API key
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const resultEl = document.querySelector(".result");
  const prevChat = localStorage.getItem("chat");

  if (prevChat) {
    resultEl.innerHTML = prevChat;
  } else {
    resultEl.innerHTML = "";
    resultEl.style.backgroundColor = "white";
  }

  const apiKey = localStorage.getItem("apiKey");
  if (!apiKey) {
    document.getElementById("apiKeySection").classList.remove("hidden");
    document.getElementById("mainSection").classList.add("hidden");
  } else {
    document.getElementById("apiKeySection").classList.add("hidden");
    document.getElementById("mainSection").classList.remove("hidden");
  }
});

// ===============================
// Save API Key
// ===============================
document.getElementById("saveApiKey").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKeyInput").value.trim();
  if (apiKey) {
    localStorage.setItem("apiKey", apiKey);
    

    document.getElementById("apiKeySection").classList.add("hidden");
    document.getElementById("mainSection").classList.remove("hidden");
  }
});

// ===============================
// Gemini API Call
// ===============================
async function callGeminiAPI(prompt) {
  const apiKey = localStorage.getItem("apiKey");
  if (!apiKey) {
    return "Please set your API key in settings.";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini response:", data);

    if (
      data.candidates &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0].text
    ) {
      return data.candidates[0].content.parts[0].text;
    } else if (data.error) {
      return "API Error: " + data.error.message;
    } else {
      return "No valid response from Gemini.";
    }
  } catch (err) {
    console.error("Gemini Error:", err);
    return "API Error: " + err.message;
  }
}

// ===============================
// Send Message
// ===============================
async function handleSend() {
  const input = document.getElementById("userInput");
  const text = input.value.trim() + (localStorage.getItem("chat")==null?"":localStorage.getItem("chat"));
  console.log(text);
  if (!text) return;

  addMessage(input.value.trim(), "you");
  input.value = "";
  input.style.height = "auto";

  const reply = await callGeminiAPI(text);
  let finalMSg = reply.replaceAll(/```[\w]*\n?/g, ""); // Remove ```lang or ``` if any
  finalMSg = finalMSg.replaceAll(/^\d+\.\s?/gm, (match) => match.trim() + " "); // Add space after numbering
  finalMSg = finalMSg.replaceAll(/\n{3,}/g, "\n\n"); // Limit consecutive newlines to 2
  finalMSg = finalMSg.replaceAll("**", ""); // Remove any remaining ***
  addMessage(finalMSg, "bot");
}

// Button click
document.getElementById("sendMessage").addEventListener("click", handleSend);

// Enter / Shift+Enter
const userInput = document.getElementById("userInput");
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Auto-resize input (ChatGPT style)
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
});

// ===============================
// "Approach" button → extract text
// ===============================
document.getElementById("approach").addEventListener("click", async () => {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let tab = tabs[0];

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        const el = document.querySelector(".elfjS");
        return el ? el.innerText : "No text found!";
      },
    },
    async (injectionResults) => {
      const pageText = injectionResults[0].result;
      addMessage("write the approach of the following problem", "you");
      let prompt =
        'Provide an approach to solve the following problem,[Important] use indexing , make it simplest and easy to understand and do not write the solution:\n"' +
        pageText +
        '"';
      let botMessage = await callGeminiAPI(prompt);
      let finalMSg = botMessage.replaceAll(/```[\w]*\n?/g, ""); // Remove ```lang or ``` if any
      finalMSg = finalMSg.replaceAll(/^\d+\.\s?/gm, (match) => match.trim() + " "); // Add space after numbering
      finalMSg = finalMSg.replaceAll(/\n{3,}/g, "\n\n"); // Limit consecutive newlines to 2
      finalMSg = finalMSg.replaceAll("**", ""); // Remove any remaining ***
      addMessage(finalMSg, "bot");
    }
  );
});


document.getElementById("writeCode").addEventListener("click", async () => {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let tab = tabs[0];

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        const el = document.querySelector(".elfjS"); // Problem statement
        const codeEl = document.querySelector(".monaco-scrollable-element"); // Monaco container
        return {
          problemText: el ? el.innerText : "No problem text found!",
          codeText: codeEl ? codeEl.innerText : "No code found!",
        };
      },
    },
    async (injectionResults) => {
      const { problemText, codeText } = injectionResults[0].result;

      addMessage("write the solution for this problem", "you");

      let prompt =
        "Write the solution for this problem. [Important] Do not use any extra character or language name, just return complete code:\n" +
        "Problem:\n" +
        problemText +
        "\nExisting code (if any):\n" +
        codeText;

      let botMessage = await callGeminiAPI(prompt);
      let clearMsg = botMessage.replaceAll(/```[\w]*\n?/g, ""); // Remove ```lang or ``` if any
      let finalMsg = clearMsg.trim().replace(["java", "python", "cpp", "c++", "c", "javascript", "js"], "");

      // Inject Gemini response directly into Monaco editor
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (solution) => {
          if (window.monaco && monaco.editor) {
            const models = monaco.editor.getModels();
            if (models.length > 0) {
              models[0].setValue(solution); // ✅ Update editor properly
            } else {
              console.log("No Monaco models found!");
            }
          } else {
            console.log("Monaco editor not available on this page!");
          }
        },
        args: [finalMsg],
      });

      addMessage(finalMsg, "bot");
    }
  );
});


// ===============================
// Clear chat
// ===============================
document.getElementById("clear").addEventListener("click", () => {
  localStorage.removeItem("chat");
  const resultEl = document.querySelector(".result");
  resultEl.innerHTML = "";
  resultEl.style.backgroundColor = "white";
});

// ===============================
// Settings button
// ===============================
document.getElementById("openSettings").addEventListener("click", () => {
  document.getElementById("mainSection").classList.add("hidden");
  document.getElementById("apiKeySection").classList.remove("hidden");
});

