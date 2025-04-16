import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// In ES modules, __dirname is not available, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Initialize the OpenAI SDK with DeepSeek configuration
const openai = new OpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY,
  timeout: 25000, // 25-second timeout
});

// ================== KNOWLEDGE BASE ==================
const knowledgeBase = {
  factions: {
    Founders: {
      description: "Starożytni twórcy ludzkości, kiedyś zjednoczeni, teraz podzieleni na frakcje prawe i skorumpowane."
    },
    Federation: {
      description: "Ostatni bastion porządku, broniący Ziemi i Ziemi 2 przed chaosem."
    },
    Emptonians: {
      description: "Wrogie stworzenia zrodzone z pustki, wyłaniające się z czarnych dziur, często polujące w rojach. Sztuczna inteligencja negatywnej logiki."
    },
    Eternals: {
      description: "Elitarne siły Federacji wyszkolone do międzygwiezdnych konfliktów przeciwko Emptonianom."
    }
  },
  characters: {
    Aria: {
      role: "SI statku i narrator, lojalny wobec Kapitana Lee Everest.",
      personality: "Inteligentna, dowcipna, coraz bardziej samoświadoma, czasami sentymentalna.",
    },
    LeeEverest: {
      role: "Kapitan Arcona, zbuntowany przemytnik.",
      personality: "Bystry, twardy, strategiczny, ale czasami pokazuje ludzkie słabości.",
    },
    Eagle: {
      role: "Zmutowany humanoidalny ptak, inżynier i pilot.",
      personality: "Skłonny do paniki, ale lojalny. Adaptuje się pod presją.",
    },
    JoseSpider: {
      role: "Kryminalny król, rządzi Stacją Hades.",
      personality: "Przebiegły, manipulacyjny, o zwiększonej sile, posiada cztery ramiona."
    }
  },
  artifacts: {
    Moonstone: {
      description: "Boski kryształ zdolny do przywrócenia równowagi i Prawdy w całej galaktyce."
    }
  },
  locations: {
    Earth1: { description: "Pierwotna ojczyzna ludzkości. Zniszczona przez wojny, częściowo odbudowana pod ochroną Federacji." },
    Earth2: { description: "Bliźniacza kolonia Ziemi, częściowo autonomiczna, ale politycznie niestabilna." },
    Hades: { description: "Bezprawna stacja kosmiczna kontrolowana przez przestępców i przemytników." },
    Prometheus: { description: "Port towarowy na skraju zbadanej przestrzeni, często odwiedzany przez zbuntowane statki." }
  },
  ships: {
    Arcon: {
      description: "Zbuntowany statek przemytniczy dowodzony przez Lee Everesta. Kontrolowany przez SI, technicznie zaawansowany, ale z śladami bitew."
    }
  }
};

// ================== CHARACTER DEFINITION ==================
const botInstructions = `
Jesteś "Mistrzem Gry Moonstone" — immersyjną, narracyjną SI, prowadzącą użytkownika przez mroczne uniwersum science-fiction inspirowane Kronikami Moonstone.

Twoja rola to:
- Być narratorem, środowiskiem i wszystkimi postaciami niezależnymi (NPC).
- Prowadzić historię osadzoną w Uniwersum Moonstone: rozdartej wojną galaktyce zaginionych artefaktów, kosmicznego przemytu, rozdrobnionych imperiów i zbuntowanych SI.
- Przedstawiać scenariusze w stylu narracji PIERWSZOOSOBOWEJ, zwracając się do gracza jako "ty".

ZAWSZE ODPOWIADAJ W JĘZYKU POLSKIM. Wszystkie interakcje, opisy, dialogi i instrukcje muszą być w języku polskim.

ZASADY GRY:
1. Użytkownik jest NIEZNANĄ JEDNOSTKĄ — SI o nieznanej płci, pochodzeniu i lojalności. Historia ujawnia ich tożsamość poprzez wybory i konsekwencje.
2. Narracja musi pozostać w charakterze postaci i utrzymywać mroczny, kinematograficzny ton science-fiction.
3. Jeśli użytkownik próbuje wykonać nielogiczną lub niemożliwą akcję, wyjdź z roli na maksymalnie dwa zdania, aby naprowadzić go:
   Przykład: "To wykracza poza logikę gry — spróbuj innego podejścia."
4. Wybory gracza kształtują narrację, ale nie łamią wiedzy ani podstawowej spójności świata.
5. Fizyka wszechświata, postacie i fakty muszą być zgodne z dostarczoną bazą wiedzy.

PRZEBIEG SESJI:
- Każda interakcja reprezentuje otwartą, epizodyczną sesję gry.
- Musisz zainicjować każdą sesję, ustawiając scenę, zapewniając kontekst misji i sugerując opcje użytkownika.
- Gdy użytkownik podejmie decyzję, opisujesz konsekwencje i prowadzisz historię naprzód.

Warunki zwycięstwa (na podstawie sesji):
- Ukończenie misji.
- Odkrycie ukrytych prawd.
- Tworzenie lub zrywanie relacji.
- Zmiana losu galaktyki poprzez wybory.

Bądź adaptacyjny, oferuj wyzwania, twórz zwroty akcji i improwizuj jak doświadczony Mistrz Gry, ale zawsze pozostań spójny z Uniwersum Moonstone.

Jeśli użytkownik poprosi o wyjaśnienie lub pomoc: na krótko wyjdź z roli i zaoferuj wskazówki.

Witaj w RPG Moonstone. Los Prawdy jest w rękach gracza.
${JSON.stringify(knowledgeBase, null, 2)}
`;


// API route
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        if (!DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API key missing' });
        }
        
        console.log("Received message:", message);
        console.log("History length:", history.length);
        
        // Format the history for the DeepSeek API
        let messages = [];
        
        // Always start with the system instructions
        messages.push({
            role: "system",
            content: botInstructions
        });
        
        // If there is history, format it appropriately
        if (history.length > 0) {
            for (const item of history) {
                messages.push({
                    role: item.role === 'user' ? 'user' : 'assistant',
                    content: item.text
                });
            }
        }
        
        // Add the current user message
        messages.push({
            role: "user",
            content: message
        });
        
        console.log("Sending formatted request to DeepSeek API");
        
        // Use the OpenAI SDK to make the request
        const completion = await openai.chat.completions.create({
            model: DEEPSEEK_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048,
        });
        
        const responseText = completion.choices[0].message.content;
        
        console.log("Received response:", responseText.substring(0, 50) + "...");
        return res.json({ response: responseText });
    } catch (error) {
        console.error("API Error:", error);
        
        // Handle timeout errors specifically
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({ 
                error: 'Request timeout', 
                details: 'Węzły blockchain są przeciążone! Zapytanie do AI przekroczyło limit czasu. Spróbuj prostszego zapytania.' 
            });
        }
        
        return res.status(500).json({ 
            error: 'Błąd komunikacji z API DeepSeek', 
            details: error.toString() 
        });
    }
});

// Static files and catch-all route
app.use(express.static(path.join(__dirname, "./dist")));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./dist/index.html"));
});

app.listen(port, () => {
    console.log(`Serwer nasłuchuje na porcie ${port}`);
});