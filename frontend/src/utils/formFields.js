export const FORM_FIELDS = [
  // ── PERSONAL INFO ──
  {
    section: "Personal Info",
    icon: "👤",
    fields: [
      { name: "Age",        label: "Age",    type: "number", min: 18, max: 100, step: 1,   placeholder: "e.g. 24",    unit: "yrs" },
      { name: "Gender",     label: "Gender", type: "select", options: ["Male","Female","Other"] },
      { name: "Age_Group",  label: "Age Group", type: "select", options: ["18-21","22-25","26-29","30-40","40+"] },
    ]
  },
  // ── VITALS ──
  {
    section: "Vitals",
    icon: "❤️",
    fields: [
      { name: "Heart_Rate",               label: "Heart Rate",            type: "number", min: 40,  max: 200, step: 1, placeholder: "72",   unit: "bpm"  },
      { name: "Respiration_Rate",         label: "Respiration Rate",      type: "number", min: 8,   max: 40,  step: 1, placeholder: "16",   unit: "/min" },
      { name: "Blood_Pressure_Systolic",  label: "BP Systolic",           type: "number", min: 80,  max: 200, step: 1, placeholder: "120",  unit: "mmHg" },
      { name: "Blood_Pressure_Diastolic", label: "BP Diastolic",          type: "number", min: 50,  max: 130, step: 1, placeholder: "80",   unit: "mmHg" },
    ]
  },
  // ── LIFESTYLE ──
  {
    section: "Lifestyle",
    icon: "🏃",
    fields: [
      { name: "Sleep_Duration_Hours",               label: "Sleep Duration",          type: "number", min: 0, max: 24,  step: 0.5, placeholder: "7",   unit: "hrs/day"      },
      { name: "Active_Hours_Per_Day",               label: "Active Hours",            type: "number", min: 0, max: 24,  step: 0.5, placeholder: "2",   unit: "hrs/day"      },
      { name: "Screen_Time_Hours",                  label: "Screen Time",             type: "number", min: 0, max: 24,  step: 0.5, placeholder: "5",   unit: "hrs/day"      },
      { name: "Physical_Activity_Sessions_Per_Week","label": "Exercise Sessions",     type: "number", min: 0, max: 14,  step: 1,   placeholder: "3",   unit: "sessions/wk"  },
      { name: "Water_Intake_Liters",                label: "Water Intake",            type: "number", min: 0, max: 10,  step: 0.1, placeholder: "2.5", unit: "liters/day"   },
      { name: "Caffeine_Intake_mg",                 label: "Caffeine Intake",         type: "number", min: 0, max: 1000,step: 10,  placeholder: "200", unit: "mg/day"       },
      { name: "Hydration_Category",                 label: "Hydration Level",         type: "select", options: ["High","Medium","Low"] },
    ]
  },
  // ── MENTAL / STRESS ──
  {
    section: "Mental & Stress",
    icon: "🧠",
    fields: [
      { name: "Stress_Level",              label: "Stress Level (1-10)",       type: "range",  min: 1, max: 10, step: 1, placeholder: "5"  },
      { name: "Mood_Rating",               label: "Mood Rating (1-10)",         type: "range",  min: 1, max: 10, step: 1, placeholder: "7"  },
      { name: "Social_Interaction_Score",  label: "Social Interaction (1-10)",  type: "range",  min: 1, max: 10, step: 1, placeholder: "6"  },
      { name: "Productivity_Score",        label: "Productivity Score (1-10)",  type: "range",  min: 1, max: 10, step: 1, placeholder: "7"  },
      { name: "Deadline_Facing_Per_Month", label: "Deadlines per Month",        type: "number", min: 0, max: 30, step: 1, placeholder: "5", unit: "/month" },
      { name: "Mental_Health_History",     label: "Mental Health History",      type: "select", options: ["Yes","No"] },
      { name: "Due_To_Stress",             label: "Primary Stress Source",      type: "select", options: ["Academic","Workload","Financial","Family","Unknown"] },
    ]
  },
  // ── HEALTH CONDITIONS ──
  {
    section: "Health Conditions",
    icon: "🏥",
    fields: [
      { name: "Any_Disease", label: "Known Condition", type: "select", options: ["None","Asthma","Hypertension","Thyroid","Diabetes"] },
    ]
  },
]

export const DEFAULT_VALUES = {
  Age: 24, Gender: "Male", Age_Group: "22-25",
  Heart_Rate: 75, Respiration_Rate: 16,
  Blood_Pressure_Systolic: 120, Blood_Pressure_Diastolic: 80,
  Sleep_Duration_Hours: 7, Active_Hours_Per_Day: 1.5,
  Screen_Time_Hours: 6, Caffeine_Intake_mg: 200,
  Stress_Level: 5, Mental_Health_History: "No",
  Any_Disease: "None", Due_To_Stress: "Academic",
  Deadline_Facing_Per_Month: 6,
  Physical_Activity_Sessions_Per_Week: 3,
  Water_Intake_Liters: 2.5, Mood_Rating: 7,
  Social_Interaction_Score: 6, Productivity_Score: 7,
  Hydration_Category: "Medium",
}
