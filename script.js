// State management
let studentProfile = null;

document.addEventListener("DOMContentLoaded", () => {
  const savedKey = localStorage.getItem("gemini_api_key");
  if (savedKey) document.getElementById("apiKeyInput").value = savedKey;

  const savedProfile = localStorage.getItem("student_profile");
  if (savedProfile) {
    studentProfile = JSON.parse(savedProfile);
    showDashboard();
  }
  lucide.createIcons();
});

function getApiKey() {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) {
    alert("Please enter your free Google Gemini API key at the top first! (Get it free from aistudio.google.com)");
    return null;
  }
  return key;
}

// Reusable Gemini API caller
async function callGemini(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Failed to contact Gemini API");
  }

  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Onboarding login handler
function handleLogin() {
  const name = document.getElementById("inputName").value.trim() || "Student";
  const branch = document.getElementById("inputBranch").value;
  const sem = document.getElementById("inputSem").value;
  const goal = document.getElementById("inputGoal").value;

  studentProfile = { name, branch, sem, goal };
  localStorage.setItem("student_profile", JSON.stringify(studentProfile));
  showDashboard();
}

function showDashboard() {
  document.getElementById("screenOnboarding").classList.add("hidden");
  document.getElementById("screenDashboard").classList.remove("hidden");
  document.getElementById("profileBadge").classList.remove("hidden");

  document.getElementById("badgeName").innerText = studentProfile.name;
  document.getElementById("badgeBranch").innerText = studentProfile.branch.split(" ")[0];
  document.getElementById("labelRolesBranch").innerText = studentProfile.branch;

  fetchBranchRoles();
  lucide.createIcons();
}

function resetProfile() {
  localStorage.removeItem("student_profile");
  location.reload();
}

// Tab Switching
function switchDashboardTab(tab) {
  const views = {
    roles: document.getElementById("viewRoles"),
    roadmap: document.getElementById("viewRoadmap"),
    syllabus: document.getElementById("viewSyllabus")
  };
  const buttons = {
    roles: document.getElementById("tabRoles"),
    roadmap: document.getElementById("tabRoadmap"),
    syllabus: document.getElementById("tabSyllabus")
  };

  Object.keys(views).forEach(k => {
    if (k === tab) {
      views[k].classList.remove("hidden");
      buttons[k].className = "px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white transition flex items-center gap-2";
    } else {
      views[k].classList.add("hidden");
      buttons[k].className = "px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 transition flex items-center gap-2";
    }
  });

  if (tab === 'roadmap' && document.getElementById("roadmapContainer").children.length === 0) {
    fetchSemesterRoadmap();
  }
  lucide.createIcons();
}

// FEATURE 1: Fetch Job Roles & Skills for Branch
async function fetchBranchRoles() {
  const btn = document.getElementById("btnFetchRoles");
  const container = document.getElementById("rolesContainer");
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Loading...`;
  lucide.createIcons();

  const prompt = `
    The student is from Branch: "${studentProfile.branch}".
    Return a JSON object containing an array of 4 to 6 top high-growth job roles accessible to this branch (including software and hybrid roles).
    Format:
    {
      "roles": [
        {
          "title": "Role Title",
          "category": "Software / Core / Hybrid",
          "salaryRange": "e.g. 6 - 18 LPA",
          "description": "What they actually do in simple terms...",
          "coreSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
          "recommendedTools": ["Tool/Framework 1", "Tool/Framework 2"],
          "whyBranchFit": "Why students from ${studentProfile.branch} excel here"
        }
      ]
    }
  `;

  try {
    const data = await callGemini(prompt);
    if (!data) return;

    container.innerHTML = data.roles.map(r => `
      <div class="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-5 hover:border-indigo-500/50 transition space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${r.category.includes('Software') ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'}">
            ${r.category}
          </span>
          <span class="text-xs font-mono font-bold text-amber-400">${r.salaryRange}</span>
        </div>
        <h4 class="text-base font-bold text-white">${r.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed">${r.description}</p>
        
        <div class="space-y-2 pt-2 border-t border-slate-700/60">
          <div class="text-xs">
            <span class="text-slate-400 font-semibold">Must-Have Skills:</span>
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${r.coreSkills.map(s => `<span class="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[11px] text-slate-200">${s}</span>`).join('')}
            </div>
          </div>
          <div class="text-xs">
            <span class="text-slate-400 font-semibold">Tools & Frameworks:</span>
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${r.recommendedTools.map(t => `<span class="bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 px-2 py-0.5 rounded text-[11px]">${t}</span>`).join('')}
            </div>
          </div>
          <p class="text-[11px] text-slate-400 italic pt-1">💡 <strong class="text-slate-300">Why your branch:</strong> ${r.whyBranchFit}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    alert("Error loading roles: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh Roles`;
    lucide.createIcons();
  }
}

// FEATURE 2: 8-Semester Target Roadmap
async function fetchSemesterRoadmap() {
  const btn = document.getElementById("btnFetchRoadmap");
  const container = document.getElementById("roadmapContainer");
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Generating 4-Year Plan...`;
  lucide.createIcons();

  const prompt = `
    Create a 4-Year, 8-Semester target learning roadmap for a B.Tech student:
    Branch: "${studentProfile.branch}"
    Current Semester: "${studentProfile.sem}"
    Goal: "${studentProfile.goal}"

    Return JSON:
    {
      "years": [
        {
          "yearNumber": 1,
          "yearTitle": "Foundations & Problem Solving",
          "semesters": [
            {
              "semNumber": 1,
              "focus": "Core programming & CS logic",
              "skillsToLearn": ["C/Python syntax", "Git & GitHub", "Basic Math"],
              "miniMilestone": "Build a command-line tool and push to GitHub."
            },
            {
              "semNumber": 2,
              "focus": "Data Structures & Linux",
              "skillsToLearn": ["Arrays, Linked Lists", "Linux CLI", "LeetCode Easy"],
              "miniMilestone": "Solve 50 coding problems."
            }
          ]
        },
        {
          "yearNumber": 2,
          "yearTitle": "Core Engineering & Architecture",
          "semesters": [
            {
              "semNumber": 3,
              "focus": "Databases & Object-Oriented Design",
              "skillsToLearn": ["SQL & PostgreSQL", "Java/Python OOP", "API basics"],
              "miniMilestone": "Build a database-backed CRUD application."
            },
            {
              "semNumber": 4,
              "focus": "Advanced DSA & Web/Cloud Foundations",
              "skillsToLearn": ["Trees, Graphs", "REST APIs", "Docker basics"],
              "miniMilestone": "Deploy a containerized API to the cloud."
            }
          ]
        },
        {
          "yearNumber": 3,
          "yearTitle": "Specialization & Internship Readiness",
          "semesters": [
            {
              "semNumber": 5,
              "focus": "Full-Stack / Core Domain Project",
              "skillsToLearn": ["Modern Web/Backend Framework", "Cloud (AWS/GCP)", "CI/CD basics"],
              "miniMilestone": "Deploy 1 flagship full-stack project."
            },
            {
              "semNumber": 6,
              "focus": "Interview Preparation & Summer Internships",
              "skillsToLearn": ["System Design basics", "Mock Interviews", "Resume building"],
              "miniMilestone": "Apply to 30+ summer internships."
            }
          ]
        },
        {
          "yearNumber": 4,
          "yearTitle": "Placement Drive & Corporate Transition",
          "semesters": [
            {
              "semNumber": 7,
              "focus": "Campus Placements & Coding Rounds",
              "skillsToLearn": ["Core CS revision (OS, DBMS, Networks)", "Aptitude rounds"],
              "miniMilestone": "Clear on-campus & off-campus technical tests."
            },
            {
              "semNumber": 8,
              "focus": "Corporate Readiness & Capstone Delivery",
              "skillsToLearn": ["Agile, Jira, PR Reviews", "Open Source Contribution"],
              "miniMilestone": "Complete final capstone project and transition to company."
            }
          ]
        }
      ]
    }
  `;

  try {
    const data = await callGemini(prompt);
    if (!data) return;

    container.innerHTML = data.years.map(y => `
      <div class="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div class="flex items-center gap-3">
          <span class="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-xs">Year ${y.yearNumber}</span>
          <h4 class="text-sm font-bold text-white">${y.yearTitle}</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${y.semesters.map(s => `
            <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-indigo-400">Semester ${s.semNumber}</span>
                <span class="text-[11px] text-slate-400">${s.focus}</span>
              </div>
              <div class="space-y-1">
                <span class="text-[11px] font-semibold text-slate-400">Target Skills:</span>
                <div class="flex flex-wrap gap-1">
                  ${s.skillsToLearn.map(skill => `<span class="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded border border-slate-700">${skill}</span>`).join('')}
                </div>
              </div>
              <div class="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 p-2 rounded-lg mt-2">
                🎯 <strong>Semester Target:</strong> ${s.miniMilestone}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    alert("Error loading roadmap: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Generate Roadmap`;
    lucide.createIcons();
  }
}

// FEATURE 3: Syllabus to Software Reality Bridge
async function analyzeSyllabus() {
  const subject = document.getElementById("inputSubject").value.trim();
  const chapter = document.getElementById("inputChapter").value.trim();
  const btn = document.getElementById("btnAnalyzeSyllabus");
  const container = document.getElementById("syllabusResultContainer");

  if (!subject) {
    alert("Please enter a subject name first!");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Connecting to Corporate Architecture...";

  const prompt = `
    The student is in "${studentProfile.branch}" studying:
    College Subject: "${subject}"
    Chapter/Topic: "${chapter || 'General Subject Syllabus'}"

    Explain:
    1. Where is this subject actually used in real tech companies (e.g. Google, Amazon, Uber, Swiggy)?
    2. What modern tools/frameworks replaced the textbook paper version?
    3. A real software interview question asked on this subject.

    Return JSON:
    {
      "collegeFocus": "What college textbooks test on paper...",
      "corporateReality": "Where production systems rely on this...",
      "modernTechEquivalents": [
        {"textbook": "Old concept/tool", "modernTool": "Modern tool in companies", "explanation": "Why companies use it"}
      ],
      "interviewQuestion": "A real technical interview question from this subject"
    }
  `;

  try {
    const data = await callGemini(prompt);
    if (!data) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
          <span class="text-xs font-bold text-amber-400 uppercase tracking-wider">What College Exams Ask</span>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">${data.collegeFocus}</p>
        </div>
        <div class="bg-indigo-950/40 border border-indigo-700/60 rounded-xl p-5">
          <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">How Companies Use It In Production</span>
          <p class="text-xs text-slate-200 mt-2 leading-relaxed">${data.corporateReality}</p>
        </div>
      </div>

      <div class="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
        <h4 class="font-bold text-white text-xs mb-3">Modern Tools vs Textbook Tools</h4>
        <div class="space-y-2">
          ${data.modernTechEquivalents.map(m => `
            <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex flex-col md:flex-row justify-between gap-2">
              <div>
                <span class="text-red-400 font-semibold">Textbook:</span> ${m.textbook} ➔ 
                <span class="text-emerald-400 font-bold">${m.modernTool}</span>
              </div>
              <span class="text-slate-400">${m.explanation}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bg-gradient-to-r from-purple-950/50 to-slate-900 border border-purple-700/50 rounded-xl p-5">
        <h4 class="font-bold text-purple-300 text-xs mb-1">💼 Real Technical Interview Question on this Subject</h4>
        <p class="text-xs text-slate-200 italic font-mono bg-slate-950/70 p-3 rounded-lg border border-slate-800 mt-2">${data.interviewQuestion}</p>
      </div>
    `;
    container.classList.remove("hidden");
  } catch (err) {
    alert("Error analyzing syllabus: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Analyze Corporate Application</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}