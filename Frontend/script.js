/* =====================================================
   J.A.R.V.I.S
   CORE BRAIN + MEMORY + VOICE + VISION
   ===================================================== */


/* =====================================================
   1. CONFIGURATION
   ===================================================== */

const MODEL = "gemini-3.8-flash";

const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/"
    + MODEL
    + ":generateContent";


/* =====================================================
   2. GET ELEMENTS
   ===================================================== */

const chat = document.getElementById("chat");
const input = document.getElementById("msg");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const clearBtn = document.getElementById("clear-btn");

const imgInput = document.getElementById("img-input");


/* =====================================================
   3. API KEY
   ===================================================== */

let API_KEY = localStorage.getItem("jarvis_api_key");

if (!API_KEY) {

    API_KEY = prompt(
        "Enter your Gemini API Key:"
    );

    if (API_KEY) {
        localStorage.setItem(
            "jarvis_api_key",
            API_KEY
        );
    }
}


/* =====================================================
   4. MEMORY
   ===================================================== */

let MEMORY = [];

try {

    MEMORY = JSON.parse(
        localStorage.getItem("jarvis_memory") || "[]"
    );

    if (!Array.isArray(MEMORY)) {
        MEMORY = [];
    }

} catch (error) {

    MEMORY = [];
}


/* =====================================================
   5. SAVE MEMORY
   ===================================================== */

function saveMemory() {

    localStorage.setItem(
        "jarvis_memory",
        JSON.stringify(MEMORY)
    );
}


/* =====================================================
   6. LOAD MEMORY INTO CHAT
   ===================================================== */

function loadMemory() {

    MEMORY.forEach(message => {

        if (message.role === "user") {

            addMessage(
                "YOU: " + message.text,
                "user"
            );

        } else if (message.role === "model") {

            addMessage(
                "J.A.R.V.I.S: " + message.text,
                "ai"
            );

        }

    });
}


/* =====================================================
   7. ADD MESSAGE
   ===================================================== */

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "msg " + type;

    div.textContent = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

    return div;
}


/* =====================================================
   8. GEMINI REQUEST
   ===================================================== */

async function callGemini(prompt) {

    if (!API_KEY) {

        throw new Error(
            "Gemini API key is missing."
        );
    }


    /*
       Take only recent conversation.
       This prevents unlimited local memory
       from being sent to the API.
    */

    const history = MEMORY
        .slice(-10)
        .map(message => {

            return {
                role: message.role,
                parts: [
                    {
                        text: message.text
                    }
                ]
            };

        });


    /*
       Add current user message.
    */

    history.push({

        role: "user",

        parts: [
            {
                text: prompt
            }
        ]

    });


    const response = await fetch(

        API_URL + "?key=" + encodeURIComponent(API_KEY),

        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                systemInstruction: {

                    parts: [
                        {
                            text:
                                "You are J.A.R.V.I.S, a helpful personal AI assistant. " +
                                "Be concise, intelligent, polite and practical. " +
                                "You may call the user Sir."
                        }
                    ]

                },

                contents: history

            })

        }

    );


    const data = await response.json();


    /* =================================================
       API ERROR
       ================================================= */

    if (!response.ok || data.error) {

        const message =
            data?.error?.message ||
            "Gemini API request failed.";

        throw new Error(message);
    }


    /* =================================================
       EXTRACT RESPONSE
       ================================================= */

    const reply =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();


    if (!reply) {

        throw new Error(
            "J.A.R.V.I.S returned an empty response."
        );
    }


    return reply;
}


/* =====================================================
   9. ASK JARVIS
   ===================================================== */

async function askJarvis(prompt) {

    const thinkingMessage = addMessage(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );


    try {

        const reply = await callGemini(prompt);


        /*
           Save conversation.
        */

        MEMORY.push({
            role: "user",
            text: prompt
        });

        MEMORY.push({
            role: "model",
            text: reply
        });


        /*
           Keep local memory manageable.
        */

        if (MEMORY.length > 40) {

            MEMORY = MEMORY.slice(-40);

        }


        saveMemory();


        /*
           Update UI.
        */

        thinkingMessage.textContent =
            "J.A.R.V.I.S: " + reply;


        /*
           Speak response.
        */

        speak(reply);

    } catch (error) {

        console.error(error);

        thinkingMessage.textContent =
            "J.A.R.V.I.S: ERROR - " +
            error.message;

    }

}


/* =====================================================
   10. SEND BUTTON
   ===================================================== */

sendBtn.addEventListener(
    "click",
    sendMessage
);


function sendMessage() {

    const text = input.value.trim();

    if (!text) {
        return;
    }


    addMessage(
        "YOU: " + text,
        "user"
    );


    input.value = "";


    askJarvis(text);
}


/* =====================================================
   11. ENTER KEY
   ===================================================== */

input.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


/* =====================================================
   12. CLEAR MEMORY
   ===================================================== */

clearBtn.addEventListener(
    "click",
    function() {

        const confirmed =
            confirm(
                "Clear all J.A.R.V.I.S memory?"
            );


        if (!confirmed) {
            return;
        }


        MEMORY = [];

        localStorage.removeItem(
            "jarvis_memory"
        );


        chat.innerHTML = "";


        addMessage(
            "SYSTEM: Memory cleared.",
            "ai"
        );

    }
);


/* =====================================================
   13. VOICE RECOGNITION
   ===================================================== */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    const recognition =
        new SpeechRecognition();


    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;


    recognition.onstart = function() {

        micBtn.textContent =
            "🔴 LISTENING...";

    };


    recognition.onresult =
        function(event) {

            const text =
                event.results[0][0].transcript;


            input.value = text;


            addMessage(
                "YOU: " + text,
                "user"
            );


            input.value = "";


            askJarvis(text);

        };


    recognition.onerror =
        function(event) {

            console.error(
                "Voice error:",
                event.error
            );

            addMessage(
                "SYSTEM: Voice input error - " +
                event.error,
                "ai"
            );

        };


    recognition.onend =
        function() {

            micBtn.textContent =
                "🎙️ VOICE";

        };


    micBtn.addEventListener(
        "click",
        function() {

            try {

                recognition.start();

            } catch (error) {

                console.log(error);

            }

        }
    );

} else {

    micBtn.addEventListener(
        "click",
        function() {

            alert(
                "Voice recognition is not supported by this browser."
            );

        }
    );

}


/* =====================================================
   14. TEXT TO SPEECH
   ===================================================== */

let voices = [];


function loadVoices() {

    voices =
        window.speechSynthesis.getVoices();

}


loadVoices();


if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged =
        loadVoices;

}


function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }


    speechSynthesis.cancel();


    const cleanText =
        text
            .replace(/[*#_`]/g, "")
            .slice(0, 3000);


    const utterance =
        new SpeechSynthesisUtterance(
            cleanText
        );


    utterance.rate = 1.0;

    utterance.pitch = 0.85;

    utterance.volume = 1.0;


    const englishVoice =
        voices.find(
            voice =>
                voice.lang &&
                voice.lang.toLowerCase()
                    .startsWith("en")
        );


    if (englishVoice) {

        utterance.voice =
            englishVoice;

    }


    speechSynthesis.speak(
        utterance
    );

}


/* =====================================================
   15. VISION BUTTON
   ===================================================== */

camBtn.addEventListener(
    "click",
    function() {

        imgInput.click();

    }
);


/* =====================================================
   16. IMAGE SELECTED
   ===================================================== */

imgInput.addEventListener(
    "change",
    function() {

        const file =
            imgInput.files?.[0];


        if (!file) {
            return;
        }


        if (!file.type.startsWith("image/")) {

            alert(
                "Please select an image."
            );

            return;

        }


        const reader =
            new FileReader();


        reader.onload =
            async function(event) {

                const result =
                    event.target.result;


                const base64 =
                    result.split(",")[1];


                const question =
                    input.value.trim() ||
                    "Analyze this image and describe what you see.";


                addMessage(
                    "YOU: [IMAGE] " + question,
                    "user"
                );


                input.value = "";


                await analyzeImage(
                    base64,
                    file.type,
                    question
                );

            };


        reader.readAsDataURL(file);

    }
);


/* =====================================================
   17. IMAGE ANALYSIS
   ===================================================== */

async function analyzeImage(
    base64,
    mimeType,
    question
) {

    const message =
        addMessage(
            "J.A.R.V.I.S: Analyzing image...",
            "ai"
        );


    try {

        if (!API_KEY) {

            throw new Error(
                "Gemini API key is missing."
            );

        }


        const response =
            await fetch(

                API_URL +
                "?key=" +
                encodeURIComponent(API_KEY),

                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        systemInstruction: {

                            parts: [
                                {
                                    text:
                                        "You are J.A.R.V.I.S. " +
                                        "Analyze images accurately. " +
                                        "Do not invent details."
                                }
                            ]

                        },

                        contents: [

                            {

                                role: "user",

                                parts: [

                                    {
                                        text:
                                            question
                                    },

                                    {
                                        inlineData: {

                                            mimeType:
                                                mimeType,

                                            data:
                                                base64

                                        }

                                    }

                                ]

                            }

                        ]

                    })

                }

            );


        const data =
            await response.json();


        if (!response.ok || data.error) {

            throw new Error(
                data?.error?.message ||
                "Vision request failed."
            );

        }


        const reply =
            data?.candidates?.[0]
                ?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();


        if (!reply) {

            throw new Error(
                "No image analysis returned."
            );

        }


        message.textContent =
            "J.A.R.V.I.S: " + reply;


        speak(reply);


    } catch (error) {

        console.error(error);

        message.textContent =
            "J.A.R.V.I.S: VISION ERROR - " +
            error.message;

    }


    /*
       Allow selecting the same image again.
    */

    imgInput.value = "";

}


/* =====================================================
   18. STARTUP
   ===================================================== */

loadMemory();


console.log(
    "J.A.R.V.I.S initialized."
); 