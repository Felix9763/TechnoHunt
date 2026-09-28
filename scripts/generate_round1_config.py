import json
import os

teams = []

# PIN assignments
pins = {
    # Track A
    "A1": "200976", "A2": "634085", "A3": "398576", "A4": "232730",
    "A5": "411747", "A6": "309563", "A7": "726267", "A8": "630431",
    # Track B
    "B1": "303540", "B2": "613487", "B3": "649121", "B4": "685134",
    "B5": "128134", "B6": "358998", "B7": "526962", "B8": "889902",
    # Track C
    "C1": "702479", "C2": "926928", "C3": "790581", "C4": "617952",
    "C5": "806641", "C6": "378829", "C7": "324043", "C8": "270961",
    # Track D
    "D1": "881320", "D2": "443110", "D3": "734103", "D4": "230595",
    "D5": "283721", "D6": "799307", "D7": "237611", "D8": "509418",
}

for track in ["A", "B", "C", "D"]:
    for i in range(1, 9):
        code = f"{track}{i}"
        teams.append({
            "code": code,
            "pin": pins[code],
            "track": track
        })

# Crewmate volunteers (8 key members)
volunteers = [
    {
        "id": "C1",
        "name": "Praanjali",
        "assignedLocation": "Football Net",
        "photo": "/assets/round1/Praanjali.jpeg"
    },
    {
        "id": "C2",
        "name": "K. Pujitha Sri",
        "assignedLocation": "Garden",
        "photo": "/assets/round1/K_Pujitha_Sri.jpg"
    },
    {
        "id": "C3",
        "name": "Khyathi Anand",
        "assignedLocation": "Placement Court",
        "photo": "/assets/round1/Khyathi_Anand.png"
    },
    {
        "id": "C4",
        "name": "Afrah Khan",
        "assignedLocation": "Canteen",
        "photo": "/assets/round1/Afrah_Khan.jpeg"
    },
    {
        "id": "C5",
        "name": "Asmi",
        "assignedLocation": "New Stairs",
        "photo": "/assets/round1/Asmi_Deshpande.png"
    },
    {
        "id": "C6",
        "name": "Sreyash Pattnaik",
        "assignedLocation": "Badminton Court",
        "photo": "/assets/round1/Sreyash_Pattnaik.jpeg"
    },
    {
        "id": "C7",
        "name": "Yash Raj",
        "assignedLocation": "Main Gate",
        "photo": "/assets/round1/Yash_Raj.jpg"
    },
    {
        "id": "C8",
        "name": "Bhavadesh",
        "assignedLocation": "Ground",
        "photo": "/assets/round1/Bhavadesh.jpg"
    }
]

stages = {
    "A1": {
        "clue2": {
            "zone": "Football Net",
            "riddle": "Where a ball forgets to fall asleep, netted still, its silence deep \u2014 someone crossed here, soft and fast, gone before the moment passed.",
            "prompt": "I click and freeze the world in place... what button stops then starts time back to run?",
            "codeword": "STOPWATCH"
        },
        "crewmate": {
            "id": "C1",
            "name": "Praanjali",
            "photo": "/assets/round1/Praanjali.jpeg",
            "script": "\u201cYou caught up with me! Time is fracturing across the campus. Take this frequency anchor before the glitch resets us both.\u201d",
            "code": "CHRONOSHIFT",
            "assignedLocation": "Football Net"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Bitwise AND",
            "hint": "Evaluate bitwise AND (&) between 5 (0101) and 3 (0011).",
            "intercept": "int a = 5, b = 3;\nprintf(\"%d\", a & b);",
            "answer": "1",
            "nextZone": "Canteen",
            "nextRiddle": "Where hunger goes to disappear, and footsteps echo sharp and clear \u2014 head to the Canteen."
        },
        "clue4": {
            "zone": "Canteen",
            "prompt": "What will this program print?\nint x = 8;\nprintf(\"%d\", x & (x - 1));",
            "answer": "0"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A2": {
        "clue2": {
            "zone": "Garden",
            "riddle": "Two patches green, on either side, where someone waited, stepped, and tried \u2014 the fast food light, she knew too well, to time her steps and never tell.",
            "prompt": "I make a flower bloom, then bloom once more... what looping trick turns decay away?",
            "codeword": "REWIND"
        },
        "crewmate": {
            "id": "C2",
            "name": "K. Pujitha Sri",
            "photo": "/assets/round1/K_Pujitha_Sri.jpg",
            "script": "\u201cDetective! I\u2019ve been reliving this exact moment on loop. Take this recovery sequence \u2014 use it to break the cycle.\u201d",
            "code": "TIMELOOP99",
            "assignedLocation": "Garden"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Bitwise AND",
            "hint": "Evaluate bitwise AND (&) between 13 (1101) and 1 (0001).",
            "intercept": "int n = 13;\nprintf(\"%d\", n & 1);",
            "answer": "1",
            "nextZone": "New Stairs",
            "nextRiddle": "Steps that lead toward open air \u2014 head to New Stairs to find the next lead."
        },
        "clue4": {
            "zone": "New Stairs",
            "prompt": "What will this program print?\nint a = 3, b = 4;\nprintf(\"%d\", (a == 3) && (b > 2));",
            "answer": "1"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A3": {
        "clue2": {
            "zone": "Placement Court",
            "riddle": "Where futures hang, printed and proud, she waited here, alone, unbowed \u2014 scrolling one thing, again, again, until the courage came to enter in.",
            "prompt": "I repeat the same lines again and again... what's the term for an endless while?",
            "codeword": "INFINITE LOOP | INFINITELOOP"
        },
        "crewmate": {
            "id": "C3",
            "name": "Khyathi Anand",
            "photo": "/assets/round1/Khyathi_Anand.png",
            "script": "\u201cYou made it across the barrier. The system entered an infinite sequence. Here is the quantum bypass code.\u201d",
            "code": "QUANTUMLEAP",
            "assignedLocation": "Placement Court"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Left Shift",
            "hint": "Left shift operator (5 << 2). Shifting left by 2 multiplies by 4.",
            "intercept": "int a = 5;\nprintf(\"%d\", a << 2);",
            "answer": "20",
            "nextZone": "Badminton Court",
            "nextRiddle": "Where shuttles fly and rackets sing \u2014 head to Badminton Court for the next anomaly."
        },
        "clue4": {
            "zone": "Badminton Court",
            "prompt": "What will this program print?\nint a = 6, b = 9;\nprintf(\"%d\", a ^ b ^ a);",
            "answer": "9"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A4": {
        "clue2": {
            "zone": "Empty Stage",
            "riddle": "Where silent boards and spotlights rest, awaiting lines to pass the test \u2014 someone paused here, dark and lone, where voices echo off the stone.",
            "prompt": "I flicker on screens, a broken frame... what error causes this jump in the air?",
            "codeword": "GLITCH"
        },
        "crewmate": {
            "id": "C4",
            "name": "Afrah Khan",
            "photo": "/assets/round1/Afrah_Khan.jpeg",
            "script": "\u201cThe monitors went wild just minutes ago! A sudden surge tore through the display. Here is the stabilization token.\u201d",
            "code": "FLUXCAPACITOR",
            "assignedLocation": "Canteen"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Right Shift",
            "hint": "Right shift operator (12 >> 2). Shifting right by 2 divides by 4.",
            "intercept": "int a = 12;\nprintf(\"%d\", a >> 2);",
            "answer": "3",
            "nextZone": "Football Net",
            "nextRiddle": "Where a ball forgets to fall asleep, netted still \u2014 head to Football Net for the next anomaly."
        },
        "clue4": {
            "zone": "Football Net",
            "prompt": "What will this program print?\nint x = 5;\nprintf(\"%d\", x << 1);",
            "answer": "10"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A5": {
        "clue2": {
            "zone": "Canteen",
            "riddle": "Where hunger goes to disappear, she entered soft, drawing near \u2014 a door, a crash, a startled sound, and something rolling on the ground.",
            "prompt": "You've felt me before, though it's the first time... what phenomenon am I, of the d\u00e9j\u00e0 kind?",
            "codeword": "DEJA VU | DEJAVU"
        },
        "crewmate": {
            "id": "C5",
            "name": "Asmi",
            "photo": "/assets/round1/Asmi_Deshpande.png",
            "script": "\u201cI knew you were coming... in fact, I feel like we did this yesterday. Take this rift key before the timeline splits.\u201d",
            "code": "TEMPORALRIFT",
            "assignedLocation": "New Stairs"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Bitwise XOR",
            "hint": "Evaluate bitwise XOR (^) between 7 (0111) and 5 (0101).",
            "intercept": "int a = 7, b = 5;\nprintf(\"%d\", a ^ b);",
            "answer": "2",
            "nextZone": "Garden",
            "nextRiddle": "Two patches green, where petals grow \u2014 head to Garden for the next anomaly."
        },
        "clue4": {
            "zone": "Garden",
            "prompt": "What will this program print?\nint a = 14;\nprintf(\"%d\", a >> 1);",
            "answer": "7"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A6": {
        "clue2": {
            "zone": "New Stairs",
            "riddle": "Fresh paint, barely worn by feet, she passed close by, unsure, discreet \u2014 steps that lead toward open air, not the way she chose, but almost there.",
            "prompt": "If you went back and stopped your own birth... what's this classic time-travel side?",
            "codeword": "PARADOX"
        },
        "crewmate": {
            "id": "C6",
            "name": "Sreyash Pattnaik",
            "photo": "/assets/round1/Sreyash_Pattnaik.jpeg",
            "script": "\u201cCareful! Changing anything in the past might erase the future. Here is the paradox cipher.\u201d",
            "code": "PARADOXCODE",
            "assignedLocation": "Badminton Court"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Bitwise NOT",
            "hint": "Bitwise NOT (~) operator. In two's complement, ~a = -(a + 1).",
            "intercept": "int a = 9;\nprintf(\"%d\", ~a);",
            "answer": "-10",
            "nextZone": "Ground",
            "nextRiddle": "The open athletic field where runners tread \u2014 head to Ground."
        },
        "clue4": {
            "zone": "Ground",
            "prompt": "What will this program print?\nint a = 5, b = 2;\nprintf(\"%d\", a > b ? a - b : b - a);",
            "answer": "3"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A7": {
        "clue2": {
            "zone": "Badminton Court",
            "riddle": "Where shuttles fly and rackets sing, something landed, an unplanned thing \u2014 not sport tonight, just panic's flight, caught in the lines under the light.",
            "prompt": "Same match, same score, replayed once more... repeating forever like a broken glass?",
            "codeword": "TIME LOOP | TIMELOOP"
        },
        "crewmate": {
            "id": "C7",
            "name": "Yash Raj",
            "photo": "/assets/round1/Yash_Raj.jpg",
            "script": "\u201cEvery time the clock hits zero, everything replays! Enter this rewind coordinate into your terminal.\u201d",
            "code": "REWINDPOINT",
            "assignedLocation": "Main Gate"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Modulo & Division",
            "hint": "Integer operations: 10 % 3 = 1, and 10 / 3 = 3. Add them together.",
            "intercept": "int a = 10;\nprintf(\"%d\", a % 3 + a / 3);",
            "answer": "4",
            "nextZone": "Placement Court",
            "nextRiddle": "Where announcements gather and futures hang \u2014 head to Placement Court."
        },
        "clue4": {
            "zone": "Placement Court",
            "prompt": "What will this program print?\nint x = 4, y = 4;\nprintf(\"%d\", (x == y) | (x > y));",
            "answer": "1"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "A8": {
        "clue2": {
            "zone": "Main Gate",
            "riddle": "Where gates stand shut and gravel waits, the outer edge of campus gates \u2014 where hurried footsteps dared to flee, turning back the master key.",
            "prompt": "Every entry undoes what came before... erasing all progress and starting from two?",
            "codeword": "RESET"
        },
        "crewmate": {
            "id": "C8",
            "name": "Bhavadesh",
            "photo": "/assets/round1/Bhavadesh.jpg",
            "script": "\u201cThe master clock has been tampered with. Take this reset token and restore the temporal line.\u201d",
            "code": "RESETCLOCK",
            "assignedLocation": "Ground"
        },
        "clue3": {
            "cipherType": "Operator Intercept // Bitwise OR",
            "hint": "Evaluate bitwise OR (|) between 6 (0110) and 3 (0011).",
            "intercept": "int a = 6, b = 3;\nprintf(\"%d\", a | b);",
            "answer": "7",
            "nextZone": "Empty Stage",
            "nextRiddle": "The quiet boards where spotlights rest \u2014 head to Empty Stage."
        },
        "clue4": {
            "zone": "Empty Stage",
            "prompt": "What will this program print?\nint a = 15;\nprintf(\"%d\", a & 8);",
            "answer": "8"
        },
        "final": {
            "zone": "Canteen",
            "directive": "All temporal anomalies converge at Canteen! The first 3 teams to reach the organizers at Canteen will claim victory!"
        }
    },
    "B1": {
        "clue2": {
            "zone": "Placement Court",
            "riddle": "Where futures hang, printed and proud, announcements made and spoken loud \u2014 the ancient rulers marked their line.",
            "prompt": "The kingdom\u2019s ruler stored precious jewels inside a strong container. What is it called?",
            "codeword": "COMPASS | CHEST"
        },
        "crewmate": {
            "id": "C1",
            "name": "Praanjali",
            "photo": "/assets/round1/Praanjali.jpeg",
            "script": "\u201cHalt, explorer! You have proven your skill in deciphering the kingdom\u2019s markers. Guard this royal cipher with your life.\u201d",
            "code": "EMBERCROWN",
            "assignedLocation": "Football Net"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Program Trace",
            "hint": "Trace the integer value of x.",
            "intercept": "int x = 3;\nx = x + 4;\nprintf(\"%d\", x);",
            "answer": "7",
            "nextZone": "Garden",
            "nextRiddle": "Two patches green where royal flowers bloom \u2014 head to Garden to find the ancient scroll."
        },
        "clue4": {
            "zone": "Garden",
            "prompt": "Decode using ASCII: 71 65 84 69",
            "answer": "GATE"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B2": {
        "clue2": {
            "zone": "Badminton Court",
            "riddle": "Where shuttles fly and rackets sing, swift steps across the wooden ring \u2014 seek the royal marker.",
            "prompt": "The kingdom\u2019s ruler stored precious jewels inside a strong container. What is it called?",
            "codeword": "CHEST | COMPASS"
        },
        "crewmate": {
            "id": "C2",
            "name": "K. Pujitha Sri",
            "photo": "/assets/round1/K_Pujitha_Sri.jpg",
            "script": "\u201cYou tread where ancient kings once walked. The lunar relic has revealed this hidden seal. Go forward!\u201d",
            "code": "MOONRELIC",
            "assignedLocation": "Garden"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Subtraction",
            "hint": "Calculate the difference.",
            "intercept": "int a = 9;\nint b = 4;\nprintf(\"%d\", a - b);",
            "answer": "5",
            "nextZone": "Football Net",
            "nextRiddle": "Where the sports netting rests \u2014 head to Football Net to find the ancient scroll."
        },
        "clue4": {
            "zone": "Football Net",
            "prompt": "Decode using ASCII: 75 69 89",
            "answer": "KEY"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B3": {
        "clue2": {
            "zone": "Main Gate",
            "riddle": "Where campus begins and barriers stand, the grand threshold of all the land \u2014 seek where ancient guards survive.",
            "prompt": "The ancient guards needed a secret word to open restricted doors. What is it called?",
            "codeword": "PASSWORD"
        },
        "crewmate": {
            "id": "C3",
            "name": "Khyathi Anand",
            "photo": "/assets/round1/Khyathi_Anand.png",
            "script": "\u201cBy royal decree, only the worthy may pass into the inner sanctum. Here is the sovereign password.\u201d",
            "code": "ROYALSTONE",
            "assignedLocation": "Placement Court"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Conditional",
            "hint": "Evaluate the condition (5 > 3).",
            "intercept": "int x = 5;\nif(x > 3)\n    printf(\"OPEN\");\nelse\n    printf(\"CLOSED\");",
            "answer": "OPEN",
            "nextZone": "Canteen",
            "nextRiddle": "Where travelers feast and merchants barter \u2014 head to Canteen to find the ancient scroll."
        },
        "clue4": {
            "zone": "Canteen",
            "prompt": "Decode using ASCII: 76 79 83 84",
            "answer": "LOST"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B4": {
        "clue2": {
            "zone": "Empty Stage",
            "riddle": "Where spotlights rest and silence grows, an empty platform no one knows \u2014 seek the parchment near the wall.",
            "prompt": "The explorer finds a drawing showing roads, landmarks and routes through the kingdom. What is it?",
            "codeword": "MAP"
        },
        "crewmate": {
            "id": "C4",
            "name": "Afrah Khan",
            "photo": "/assets/round1/Afrah_Khan.jpeg",
            "script": "\u201cThe silver archives have not been opened in centuries. Take this royal crest to unlock the next chamber.\u201d",
            "code": "SILVERCROWN",
            "assignedLocation": "Canteen"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // While Loop",
            "hint": "What sequence of numbers separated by spaces does this loop print?",
            "intercept": "int i = 1;\nwhile(i <= 3) {\n    printf(\"%d \", i);\n    i++;\n}",
            "answer": "1 2 3 | 123",
            "nextZone": "New Stairs",
            "nextRiddle": "Steps carved towards the upper citadel \u2014 head to New Stairs to find the ancient scroll."
        },
        "clue4": {
            "zone": "New Stairs",
            "prompt": "Decode using ASCII: 84 82 69 69",
            "answer": "TREE"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B5": {
        "clue2": {
            "zone": "Garden",
            "riddle": "Two patches green where cool winds blow, and shaded paths where saplings grow \u2014 seek royal signs.",
            "prompt": "A ruler wears a symbol of authority on the head. What is this royal object?",
            "codeword": "CROWN"
        },
        "crewmate": {
            "id": "C5",
            "name": "Asmi",
            "photo": "/assets/round1/Asmi_Deshpande.png",
            "script": "\u201cThe royal vault keeper left behind this golden token. Carry it to the court and claim the heritage.\u201d",
            "code": "GOLDENVAULT",
            "assignedLocation": "New Stairs"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Multiplication",
            "hint": "Multiply 2 by 5.",
            "intercept": "int x = 2;\nx = x * 5;\nprintf(\"%d\", x);",
            "answer": "10",
            "nextZone": "Placement Court",
            "nextRiddle": "The grand court where royal decrees are posted \u2014 head to Placement Court to find the ancient scroll."
        },
        "clue4": {
            "zone": "Placement Court",
            "prompt": "Decode using ASCII: 75 73 78 71",
            "answer": "KING"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B6": {
        "clue2": {
            "zone": "Football Net",
            "riddle": "Where a net catches all it's thrown, and open grass by winds is blown \u2014 seek the guide across the land.",
            "prompt": "Ancient explorers used this object to find their way across unknown lands. What points North, South, East and West?",
            "codeword": "COMPASS"
        },
        "crewmate": {
            "id": "C6",
            "name": "Sreyash Pattnaik",
            "photo": "/assets/round1/Sreyash_Pattnaik.jpeg",
            "script": "\u201cThe celestial crystal charts the way through forbidden paths. Take this fragment to unveil the lost map.\u201d",
            "code": "CRYSTALMAP",
            "assignedLocation": "Badminton Court"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Modulo",
            "hint": "Remainder of 8 divided by 3.",
            "intercept": "int x = 8;\nint y = 3;\nprintf(\"%d\", x % y);",
            "answer": "2",
            "nextZone": "Empty Stage",
            "nextRiddle": "The amphitheater where the ancient kings spoke \u2014 head to Empty Stage to find the ancient scroll."
        },
        "clue4": {
            "zone": "Empty Stage",
            "prompt": "Decode using ASCII: 67 79 68 69",
            "answer": "CODE"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B7": {
        "clue2": {
            "zone": "Canteen",
            "riddle": "Where steam ascends and hunger dies, amidst the chatter and the cries \u2014 seek the sealed container.",
            "prompt": "The kingdom\u2019s treasure was hidden inside a large wooden container. What would the explorer search for?",
            "codeword": "CHEST"
        },
        "crewmate": {
            "id": "C7",
            "name": "Yash Raj",
            "photo": "/assets/round1/Yash_Raj.jpg",
            "script": "\u201cAncient rubies illuminated the forgotten corridor. Take this gem key and advance your search.\u201d",
            "code": "ANCIENTRUBY",
            "assignedLocation": "Main Gate"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // Addition",
            "hint": "Calculate the sum of 4 and 5.",
            "intercept": "int a = 4;\nint b = 5;\nprintf(\"%d\", a + b);",
            "answer": "9",
            "nextZone": "Badminton Court",
            "nextRiddle": "The arena of speed and court lines \u2014 head to Badminton Court to find the ancient scroll."
        },
        "clue4": {
            "zone": "Badminton Court",
            "prompt": "Decode using ASCII: 84 82 69 65 83 85 82 69",
            "answer": "TREASURE"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "B8": {
        "clue2": {
            "zone": "New Stairs",
            "riddle": "Fresh steps that rise towards the sky, where hurried feet go rushing by \u2014 seek the emblem of the hall.",
            "prompt": "The explorer discovers the royal symbol of the lost kingdom. What object represents the ruler\u2019s authority?",
            "codeword": "CROWN"
        },
        "crewmate": {
            "id": "C8",
            "name": "Bhavadesh",
            "photo": "/assets/round1/Bhavadesh.jpg",
            "script": "\u201cThe lost sceptre has been located! Decrypt the inscription to reach the final sanctuary.\u201d",
            "code": "LOSTSCEPTRE",
            "assignedLocation": "Ground"
        },
        "clue3": {
            "cipherType": "Royal Manuscript // For Loop",
            "hint": "x starts at 2 and is incremented 3 times.",
            "intercept": "int x = 2;\nfor(int i = 0; i < 3; i++)\n    x++;\nprintf(\"%d\", x);",
            "answer": "5",
            "nextZone": "Ground",
            "nextRiddle": "The wide open tournament grounds \u2014 head to Ground to find the ancient scroll."
        },
        "clue4": {
            "zone": "Ground",
            "prompt": "Decode using ASCII: 75 69 89",
            "answer": "KEY"
        },
        "final": {
            "zone": "Open Gym",
            "directive": "The ancient secrets of the Lost Kingdom lead to Open Gym! The first 3 teams to report to the organizers at Open Gym will claim the royal crown!"
        }
    },
    "C1": {
        "clue2": {
            "zone": "Garden",
            "riddle": "Two patches green where shadows blend, seek where the winding path will bend.",
            "prompt": "I have a lens that makes small things grand... what tool for inspection could I possibly be?",
            "codeword": "MAGNIFYING GLASS | MAGNIFYINGGLASS"
        },
        "crewmate": {
            "id": "C1",
            "name": "Praanjali",
            "photo": "/assets/round1/Praanjali.jpeg",
            "script": "\u201cPsst! Detective, keep your voice down. The syndicate stash was moved, but they dropped this diamond intercept.\u201d",
            "code": "REDDIAMOND",
            "assignedLocation": "Football Net"
        },
        "clue3": {
            "cipherType": "Caesar Cipher // Shift -4",
            "hint": "Decode using Caesar Cipher with shift -4 (shift each letter back 4 positions: N->J, I->E, etc.).",
            "intercept": "NIAIP",
            "answer": "JEWEL",
            "nextZone": "Badminton Court",
            "nextRiddle": "Where shuttles fly and rackets clash \u2014 head to Badminton Court to intercept the suspect's drop."
        },
        "clue4": {
            "zone": "Badminton Court",
            "prompt": "What will this program print?\nint a = 10, b = 20;\nif(a < b && b < 30)\n    printf(\"%d\", a + b);\nelse\n    printf(\"%d\", a - b);",
            "answer": "30"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C2": {
        "clue2": {
            "zone": "Canteen",
            "riddle": "Where hunger goes to disappear, and footsteps echo sharp and clear.",
            "prompt": "I have no key yet I open the vault... what am I, the tool safe-crackers found?",
            "codeword": "STETHOSCOPE"
        },
        "crewmate": {
            "id": "C2",
            "name": "K. Pujitha Sri",
            "photo": "/assets/round1/K_Pujitha_Sri.jpg",
            "script": "\u201cYou found me just in time. The vault combination was transmitted in fragments. Here is the intercept slip.\u201d",
            "code": "VAULTBREAKER",
            "assignedLocation": "Garden"
        },
        "clue3": {
            "cipherType": "ASCII Decimal Intercept",
            "hint": "Decode the decimal ASCII codes: 86=V, 65=A, 85=U, 76=L, 84=T.",
            "intercept": "86 65 85 76 84",
            "answer": "VAULT",
            "nextZone": "Main Gate",
            "nextRiddle": "The perimeter checkpoint where the suspect attempted exit \u2014 head to Main Gate."
        },
        "clue4": {
            "zone": "Main Gate",
            "prompt": "What will this program print?\nint x = 4, y = 2;\nprintf(\"%d\", x * y + x / y);",
            "answer": "10"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C3": {
        "clue2": {
            "zone": "New Stairs",
            "riddle": "Steps of stone rising to the floor, leading upward to the open door.",
            "prompt": "I hold the colours that painters trust... what tool paints a lie that looks true?",
            "codeword": "PAINTBRUSH"
        },
        "crewmate": {
            "id": "C3",
            "name": "Khyathi Anand",
            "photo": "/assets/round1/Khyathi_Anand.png",
            "script": "\u201cThe evidence was nearly concealed under fresh coats. Here is the forged canvas intercept \u2014 decode it immediately.\u201d",
            "code": "FORGEDCANVAS",
            "assignedLocation": "Placement Court"
        },
        "clue3": {
            "cipherType": "Binary Byte Intercept",
            "hint": "Decode 8-bit binary bytes into ASCII characters (01000001 = 'A', 01010010 = 'R', 01010100 = 'T').",
            "intercept": "01000001 01010010 01010100",
            "answer": "ART",
            "nextZone": "Empty Stage",
            "nextRiddle": "The quiet wooden platform where rehearsals take place \u2014 head to Empty Stage."
        },
        "clue4": {
            "zone": "Empty Stage",
            "prompt": "What will this program print?\nint sum = 0;\nfor(int i = 1; i <= 5; i++)\n    sum += i;\nprintf(\"%d\", sum);",
            "answer": "15"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C4": {
        "clue2": {
            "zone": "Badminton Court",
            "riddle": "Where strings and nets divide the floor, swift footsteps hear the rally's roar.",
            "prompt": "I'm a program that walks in unseen... name the tiny thief that makes systems fail.",
            "codeword": "KEYLOGGER"
        },
        "crewmate": {
            "id": "C4",
            "name": "Afrah Khan",
            "photo": "/assets/round1/Afrah_Khan.jpeg",
            "script": "\u201cThey breached the mainframe and attempted to wipe the audit logs. Take this hacker trace and find their drop point.\u201d",
            "code": "GHOSTHACKER",
            "assignedLocation": "Canteen"
        },
        "clue3": {
            "cipherType": "Reverse Cipher",
            "hint": "The message was written in reverse order. Read backwards.",
            "intercept": "REKCAH",
            "answer": "HACKER",
            "nextZone": "Football Net",
            "nextRiddle": "The netted goal on the pitch \u2014 head to Football Net to uncover the stash."
        },
        "clue4": {
            "zone": "Football Net",
            "prompt": "What will this program print?\nint arr[3] = {5, 10, 15};\nprintf(\"%d\", arr[0] + arr[2]);",
            "answer": "20"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C5": {
        "clue2": {
            "zone": "Main Gate",
            "riddle": "The iron gate where vehicles wait, the border of the campus state.",
            "prompt": "I'm hidden in a container, sealed and taped tight... what am I called in the smuggler's routine?",
            "codeword": "CONTRABAND"
        },
        "crewmate": {
            "id": "C5",
            "name": "Asmi",
            "photo": "/assets/round1/Asmi_Deshpande.png",
            "script": "\u201cThe midnight shipment arrived under false manifests. Decrypt the manifest token before they clear out.\u201d",
            "code": "MIDNIGHTCARGO",
            "assignedLocation": "New Stairs"
        },
        "clue3": {
            "cipherType": "Caesar Cipher // Shift +5",
            "hint": "Decode Caesar cipher shifted forward by 5 (shift each letter backward 5: H->C, F->A, etc.).",
            "intercept": "HFWLT",
            "answer": "CARGO",
            "nextZone": "Canteen",
            "nextRiddle": "Where students gather for lunch and conversation \u2014 head to Canteen."
        },
        "clue4": {
            "zone": "Canteen",
            "prompt": "What will this program print?\nint x = 7;\nprintf(\"%d\", (x % 2 == 0) ? x * 2 : x * 3);",
            "answer": "21"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C6": {
        "clue2": {
            "zone": "Empty Stage",
            "riddle": "A raised wooden floor where curtains fall, silence resting against the wall.",
            "prompt": "I look real, I feel real, but I'm not what I seem... what word describes the money I make?",
            "codeword": "COUNTERFEIT"
        },
        "crewmate": {
            "id": "C6",
            "name": "Sreyash Pattnaik",
            "photo": "/assets/round1/Sreyash_Pattnaik.jpeg",
            "script": "\u201cCounterfeit notes were flooded through the perimeter. Take this sample code and trace the source.\u201d",
            "code": "FAKENOTE",
            "assignedLocation": "Badminton Court"
        },
        "clue3": {
            "cipherType": "Hexadecimal Intercept",
            "hint": "Decode hex bytes to ASCII characters: 0x46='F', 0x41='A', 0x4B='K', 0x45='E'.",
            "intercept": "46 41 4B 45",
            "answer": "FAKE",
            "nextZone": "Placement Court",
            "nextRiddle": "Where career notices and campus banners hang \u2014 head to Placement Court."
        },
        "clue4": {
            "zone": "Placement Court",
            "prompt": "What will this program print?\nint n = 3, fact = 1;\nwhile(n > 0) {\n    fact *= n;\n    n--;\n}\nprintf(\"%d\", fact);",
            "answer": "6"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C7": {
        "clue2": {
            "zone": "Football Net",
            "riddle": "White cords woven tight and deep, where goals are scored and secrets sleep.",
            "prompt": "I hold a secret that someone wants buried... what crime forces payment through fear and duress?",
            "codeword": "EXTORTION"
        },
        "crewmate": {
            "id": "C7",
            "name": "Yash Raj",
            "photo": "/assets/round1/Yash_Raj.jpg",
            "script": "\u201cThe extortionist left behind this transmission. Translate the threat telemetry to corner them.\u201d",
            "code": "SILENTTHREAT",
            "assignedLocation": "Main Gate"
        },
        "clue3": {
            "cipherType": "Morse Code Intercept",
            "hint": "Translate Morse code: - (T), .... (H), .-. (R), . (E), .- (A), - (T).",
            "intercept": "- .... .-. . .- -",
            "answer": "THREAT",
            "nextZone": "New Stairs",
            "nextRiddle": "Freshly painted concrete steps connecting the wings \u2014 head to New Stairs."
        },
        "clue4": {
            "zone": "New Stairs",
            "prompt": "What will this program print?\nint a = 2, b = 3;\nint c = a + b * b - a;\nprintf(\"%d\", c);",
            "answer": "9"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "C8": {
        "clue2": {
            "zone": "Placement Court",
            "riddle": "Where flyers hang and banners gleam, the corridor of future dream.",
            "prompt": "I slip into offices dressed like a friend... what crime steals secrets before the work's begun?",
            "codeword": "ESPIONAGE"
        },
        "crewmate": {
            "id": "C8",
            "name": "Bhavadesh",
            "photo": "/assets/round1/Bhavadesh.jpg",
            "script": "\u201cOur surveillance caught the operative red-handed. Here is the blueprint index \u2014 decrypt the contact zone.\u201d",
            "code": "STOLENBLUEPRINT",
            "assignedLocation": "Ground"
        },
        "clue3": {
            "cipherType": "Atbash Cipher",
            "hint": "Decode using Atbash cipher (reverse alphabet: H->S, K->P, B->Y).",
            "intercept": "HKB",
            "answer": "SPY",
            "nextZone": "Garden",
            "nextRiddle": "The green haven between the academic blocks \u2014 head to Garden."
        },
        "clue4": {
            "zone": "Garden",
            "prompt": "What will this program print?\nint x = 5, y = 0;\nif(x > 0)\n    y = x * x;\nelse\n    y = -x;\nprintf(\"%d\", y);",
            "answer": "25"
        },
        "final": {
            "zone": "New Stairs",
            "directive": "The syndicate's escape route was cut off at New Stairs! The first 3 detective teams to apprehend the coordinators at New Stairs will win the case!"
        }
    },
    "D1": {
        "clue2": {
            "zone": "Canteen",
            "riddle": "Where the crew docks to feast and drink, and tankards clink upon the brink.",
            "prompt": "A true pirate never loses his way. What helps a pirate find the right direction?",
            "codeword": "COMPASS"
        },
        "crewmate": {
            "id": "C1",
            "name": "Praanjali",
            "photo": "/assets/round1/Praanjali.jpeg",
            "script": "\u201cAhoy, matey! Ye weathered the storm and tracked the Black Pearl\u2019s wake. Take this pirate token to plot yer course.\u201d",
            "code": "BLACKPEARL",
            "assignedLocation": "Football Net"
        },
        "clue3": {
            "cipherType": "ASCII Decimal Intercept",
            "hint": "Decode 84 69 67 72 using ASCII.",
            "intercept": "84 69 67 72",
            "answer": "TECH",
            "nextZone": "Empty Stage",
            "nextRiddle": "Sail towards the Empty Stage to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Empty Stage",
            "prompt": "Collect the physical puzzle piece at Empty Stage (Piece codeword: SHIP).\n\nFinal Question:\nWhat will be printed?\nfor(int i = 5; i >= 1; i--)\n    printf(\"%d \", i);",
            "answer": "SHIP | 54321 | 5 4 3 2 1"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D2": {
        "clue2": {
            "zone": "New Stairs",
            "riddle": "Steps like the rigging rising high, reaching up towards the open sky.",
            "prompt": "Every pirate needs one to find the treasure. What guides the crew on their journey?",
            "codeword": "MAP"
        },
        "crewmate": {
            "id": "C2",
            "name": "K. Pujitha Sri",
            "photo": "/assets/round1/K_Pujitha_Sri.jpg",
            "script": "\u201cThe black flag flies high upon these waters! Decrypt the Captain\u2019s coordinates and sail on!\u201d",
            "code": "BLACKFLAG",
            "assignedLocation": "Garden"
        },
        "clue3": {
            "cipherType": "Binary to Decimal",
            "hint": "Convert the binary number 1010 into decimal.",
            "intercept": "1010",
            "answer": "10",
            "nextZone": "Garden Fountain",
            "nextRiddle": "Sail towards the Garden Fountain to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Garden Fountain",
            "prompt": "Collect the physical puzzle piece at Garden Fountain (Piece codeword: SHIP B).\n\nFinal Question:\nWhat is printed?\nfor(int i = 1; i <= 5; i += 2)\n    printf(\"%d \", i);",
            "answer": "SHIP B | SHIPB | 135 | 1 3 5"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D3": {
        "clue2": {
            "zone": "Garden",
            "riddle": "An island oasis green and still, where flowers bloom upon the hill.",
            "prompt": "Before a pirate can claim the treasure, what do pirates call the wooden box where their precious loot is kept?",
            "codeword": "CHEST"
        },
        "crewmate": {
            "id": "C3",
            "name": "Khyathi Anand",
            "photo": "/assets/round1/Khyathi_Anand.png",
            "script": "\u201cDead men tell no tales, but the skull token marks the sunken chest. Enter the code to unlock the navigation charts.\u201d",
            "code": "SKULL",
            "assignedLocation": "Placement Court"
        },
        "clue3": {
            "cipherType": "Captain's Log // Variable Value",
            "hint": "What will be the final value of x?",
            "intercept": "int x = 10;\nx = x + 5;\nprintf(\"%d\", x);",
            "answer": "15",
            "nextZone": "Badminton Court",
            "nextRiddle": "Sail towards the Badminton Court to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Badminton Court",
            "prompt": "Collect the physical puzzle piece at Badminton Court (Piece codeword: SHIP D).\n\nFinal Question:\nWhat will be printed?\nint i = 2;\nwhile(i <= 8) {\n    printf(\"%d \", i);\n    i += 2;\n}",
            "answer": "SHIP D | SHIPD | 2 4 6 8 | 2468"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D4": {
        "clue2": {
            "zone": "Main Gate",
            "riddle": "The harbor entrance sealed with chains, guarding entry from ocean rains.",
            "prompt": "A pirate\u2019s journey cannot continue without a name. What do we call the person who commands the ship?",
            "codeword": "CAPTAIN"
        },
        "crewmate": {
            "id": "C4",
            "name": "Afrah Khan",
            "photo": "/assets/round1/Afrah_Khan.jpeg",
            "script": "\u201cBy the Jolly Roger, ye\u2019ve proven yer mettle! Take this sea dispatch and steer for the next port.\u201d",
            "code": "JOLLYROGER",
            "assignedLocation": "Canteen"
        },
        "clue3": {
            "cipherType": "ASCII Decimal Intercept",
            "hint": "Using ASCII values, decode: 67 65 78 84 69 69 78.",
            "intercept": "67 65 78 84 69 69 78",
            "answer": "CANTEEN",
            "nextZone": "Canteen",
            "nextRiddle": "Sail towards the Canteen to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Canteen",
            "prompt": "Collect the physical puzzle piece at Canteen (Piece codeword: SHIB).\n\nFinal Question:\nWhat will be printed?\nfor(int i = 1; i <= 4; i++)\n    printf(\"%d \", i * 2);",
            "answer": "SHIB | 2 4 6 8 | 2468"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D5": {
        "clue2": {
            "zone": "Empty Stage",
            "riddle": "The ship\u2019s quarterdeck proud and wide, where captains call across the tide.",
            "prompt": "I have keys but open no locks. I have space but no room. You can enter, but you cannot walk inside. What am I?",
            "codeword": "KEYBOARD"
        },
        "crewmate": {
            "id": "C5",
            "name": "Asmi",
            "photo": "/assets/round1/Asmi_Deshpande.png",
            "script": "\u201cThe deep blue seas hold many mysteries. Here is the Captain\u2019s navigation mark \u2014 steer true!\u201d",
            "code": "SEABLUE",
            "assignedLocation": "New Stairs"
        },
        "clue3": {
            "cipherType": "Captain's Log // Modulo",
            "hint": "What is the output of 7 % 3?",
            "intercept": "int x = 7;\nint y = 3;\nprintf(\"%d\", x % y);",
            "answer": "1",
            "nextZone": "Football Net",
            "nextRiddle": "Sail towards the Football Net to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Football Net",
            "prompt": "Collect the physical puzzle piece at Football Net (Piece codeword: SHIP L).\n\nFinal Question:\nWhat will this C program print?\nint x = 4;\nif(x > 5)\n    printf(\"SEA\");\nelse\n    printf(\"LAND\");",
            "answer": "SHIP L | SHIPL | LAND"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D6": {
        "clue2": {
            "zone": "Badminton Court",
            "riddle": "The netted deck where sea winds blow, swift as flying fish below.",
            "prompt": "I have hands but cannot clap, I have a face but cannot smile. What am I?",
            "codeword": "CLOCK"
        },
        "crewmate": {
            "id": "C6",
            "name": "Sreyash Pattnaik",
            "photo": "/assets/round1/Sreyash_Pattnaik.jpeg",
            "script": "\u201cHoist the red sails! The winds are favorable. Take this cipher and search the next harbor.\u201d",
            "code": "REDSAIL",
            "assignedLocation": "Badminton Court"
        },
        "clue3": {
            "cipherType": "Captain's Log // Variable Swap",
            "hint": "What will the program print after swapping?",
            "intercept": "int a = 5;\nint b = 8;\nint temp;\ntemp = a;\na = b;\nb = temp;\nprintf(\"%d\", a);",
            "answer": "8",
            "nextZone": "Nursing Room",
            "nextRiddle": "Sail towards the Nursing Room to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Nursing Room",
            "prompt": "Collect the physical puzzle piece at Nursing Room (Piece codeword: SHIP X).\n\nFinal Question:\nWhat is the output of this C program?\nint n = 6;\nwhile(n > 2) {\n    n--;\n}\nprintf(\"%d\", n);",
            "answer": "SHIP X | SHIPX | 2"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D7": {
        "clue2": {
            "zone": "Nursing Room",
            "riddle": "The ship's sickbay where sailors mend, away from storm and howling wind.",
            "prompt": "I\u2019m always in front of you, But can never be seen. You can chase me forever, But never catch me. What am I?",
            "codeword": "FUTURE"
        },
        "crewmate": {
            "id": "C7",
            "name": "Yash Raj",
            "photo": "/assets/round1/Yash_Raj.jpg",
            "script": "\u201cThe skull banner marks the path forward. Decrypt the Captain\u2019s riddle before the tide turns.\u201d",
            "code": "SKULLFLAG",
            "assignedLocation": "Main Gate"
        },
        "clue3": {
            "cipherType": "Captain's Log // Arithmetic Trace",
            "hint": "What will the program print? Trace the value of x.",
            "intercept": "int x = 4;\nint y = 7;\nx = x + y;\ny = x - y;\nprintf(\"%d\", x);",
            "answer": "11",
            "nextZone": "Main Gate",
            "nextRiddle": "Sail towards the Main Gate to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Main Gate",
            "prompt": "Collect the physical puzzle piece at Main Gate (Piece codeword: SHIP C).\n\nFinal Question:\nThe Captain left a strange sequence: 2, 6, 12, 20, 30, ? Find the missing number.",
            "answer": "SHIP C | SHIPC | 42"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    },
    "D8": {
        "clue2": {
            "zone": "Football Net",
            "riddle": "A sprawling trawler's net outspread, where balls like flying cannonballs sped.",
            "prompt": "The Captain wants to guess the word from the number.",
            "codeword": "MS DHONI | MSD | DHONI"
        },
        "crewmate": {
            "id": "C8",
            "name": "Bhavadesh",
            "photo": "/assets/round1/Bhavadesh.jpg",
            "script": "\u201cYe\u2019ve reached the final leg of the Captain\u2019s voyage! Take this treasure token and make for the final prize.\u201d",
            "code": "TREASURE",
            "assignedLocation": "Ground"
        },
        "clue3": {
            "cipherType": "Captain's Log // Branching",
            "hint": "Evaluate the condition (5 > 3).",
            "intercept": "int x = 5;\nif(x > 3)\n    printf(\"TREASURE\");\nelse\n    printf(\"SHIP\");",
            "answer": "TREASURE",
            "nextZone": "Football Net (Goal Post)",
            "nextRiddle": "Sail towards the Goal Post to retrieve the Captain's puzzle piece."
        },
        "clue4": {
            "zone": "Football Net (Goal Post)",
            "prompt": "Collect the physical puzzle piece at Goal Post (Piece codeword: SHIP V).\n\nFinal Question:\nCaptain\u2019s Cipher: The Captain never writes the location plainly. He shifts every letter 3 places forward to keep it safe.\nDecode: WKH WUHDVXUH LV QHDU WKH JRDO",
            "answer": "SHIP V | SHIPV | THE TREASURE IS NEAR THE GOAL"
        },
        "final": {
            "zone": "Placement Board",
            "directive": "The Captain's treasure maps point directly to Placement Board! The first 3 crews to drop anchor with the organizers at Placement Board win the bounty!"
        }
    }
}

os.makedirs('config/round1', exist_ok=True)

with open('config/round1/teams.json', 'w', encoding='utf-8') as f:
    json.dump(teams, f, indent=2)

with open('config/round1/stages.json', 'w', encoding='utf-8') as f:
    json.dump(stages, f, indent=2)

print(f"Generated config/round1/teams.json ({len(teams)} teams)")
print(f"Generated config/round1/stages.json ({len(stages)} stage entries)")
