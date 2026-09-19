export const DOCTORS = [
  { id:"D001", name:"Dr. Maria Santos",   spec:"General Medicine", avail:"Available Today",     rating:4.9, reviews:120, years:10, patients:500, initials:"MS" },
  { id:"D002", name:"Dr. Juan Dela Cruz", spec:"Pediatrics",       avail:"Available Tomorrow",  rating:4.8, reviews:86,  years:8,  patients:380, initials:"JD" },
  { id:"D003", name:"Dr. Anna Reyes",     spec:"Dermatology",      avail:"Available Today",     rating:4.7, reviews:76,  years:6,  patients:290, initials:"AR" },
  { id:"D004", name:"Dr. Michael Tan",    spec:"Cardiology",       avail:"Available Tomorrow",  rating:4.9, reviews:102, years:12, patients:450, initials:"MT" },
  { id:"D005", name:"Dr. Grace Lim",      spec:"Orthopedics",      avail:"Available Today",     rating:4.6, reviews:64,  years:7,  patients:310, initials:"GL" },
];

export const PATIENTS = [
  { id:"P001", name:"Juan Dela Cruz",  contact:"0912 111 2222", email:"juan@gmail.com",   dob:"1990-03-15", gender:"Male",   blood:"O+", address:"123 Main St, Cebu" },
  { id:"P002", name:"Maria Lopez",     contact:"0912 333 4444", email:"maria@gmail.com",  dob:"1985-07-22", gender:"Female", blood:"A+", address:"456 Oak Ave, Cebu" },
  { id:"P003", name:"Pedro Ramirez",   contact:"0912 555 6666", email:"pedro@gmail.com",  dob:"1992-11-08", gender:"Male",   blood:"B+", address:"789 Pine Rd, Cebu" },
  { id:"P004", name:"Sofia Garcia",    contact:"0912 777 8888", email:"sofia@gmail.com",  dob:"1998-05-30", gender:"Female", blood:"AB+",address:"321 Elm St, Cebu" },
  { id:"P005", name:"Ana Reyes",       contact:"0912 999 0000", email:"ana@gmail.com",    dob:"1995-09-14", gender:"Female", blood:"O-", address:"654 Maple Dr, Cebu" },
];

export const APPOINTMENTS = [
  { id:"A001", patient:"Juan Dela Cruz",  doctor:"Dr. Maria Santos",   date:"Sep 10, 2026", time:"9:30 AM",  status:"Pending",   reason:"General consultation" },
  { id:"A002", patient:"Maria Lopez",     doctor:"Dr. Juan Dela Cruz", date:"Sep 10, 2026", time:"10:00 AM", status:"Pending",   reason:"Pediatric checkup" },
  { id:"A003", patient:"Pedro Ramirez",   doctor:"Dr. Anna Reyes",     date:"Sep 10, 2026", time:"11:00 AM", status:"Confirmed", reason:"Skin consultation" },
  { id:"A004", patient:"Sofia Garcia",    doctor:"Dr. Maria Santos",   date:"Sep 10, 2026", time:"1:00 PM",  status:"Pending",   reason:"Follow-up" },
  { id:"A005", patient:"Ana Reyes",       doctor:"Dr. Juan Dela Cruz", date:"Sep 15, 2026", time:"2:00 PM",  status:"Cancelled", reason:"Pediatric checkup" },
  { id:"A006", patient:"Juan Dela Cruz",  doctor:"Dr. Anna Reyes",     date:"Sep 20, 2026", time:"10:00 AM", status:"Confirmed", reason:"Skin allergy" },
  { id:"A007", patient:"Maria Lopez",     doctor:"Dr. Maria Santos",   date:"Aug 28, 2026", time:"11:00 AM", status:"Completed", reason:"General checkup" },
  { id:"A008", patient:"Pedro Ramirez",   doctor:"Dr. Michael Tan",    date:"Aug 10, 2026", time:"3:00 PM",  status:"Cancelled", reason:"Heart checkup" },
];

export const RECORDS = [
  { id:"MR001", patient:"Juan Dela Cruz",  doctor:"Dr. Maria Santos",   date:"Sep 5, 2026",  diagnosis:"Common Cold",   prescription:"Paracetamol 500mg",  notes:"Follow-up after 7 days" },
  { id:"MR002", patient:"Maria Lopez",     doctor:"Dr. Juan Dela Cruz", date:"Aug 26, 2026", diagnosis:"Fever",         prescription:"Ibuprofen 400mg",    notes:"Plenty of rest and fluids" },
  { id:"MR003", patient:"Pedro Ramirez",   doctor:"Dr. Anna Reyes",     date:"Aug 8, 2026",  diagnosis:"Skin Allergy",  prescription:"Cetirizine 10mg",    notes:"Avoid allergens" },
  { id:"MR004", patient:"Sofia Garcia",    doctor:"Dr. Maria Santos",   date:"Jul 20, 2026", diagnosis:"Hypertension",  prescription:"Amlodipine 5mg",     notes:"Monitor BP daily" },
  { id:"MR005", patient:"Ana Reyes",       doctor:"Dr. Juan Dela Cruz", date:"Jul 15, 2026", diagnosis:"Asthma",        prescription:"Salbutamol inhaler", notes:"Avoid triggers" },
];

export const SCHEDULES = [
  { id:"S001", doctor:"Dr. Maria Santos",   day:"Monday",    start:"8:00 AM",  end:"5:00 PM" },
  { id:"S002", doctor:"Dr. Maria Santos",   day:"Tuesday",   start:"8:00 AM",  end:"5:00 PM" },
  { id:"S003", doctor:"Dr. Juan Dela Cruz", day:"Monday",    start:"8:00 AM",  end:"6:00 PM" },
  { id:"S004", doctor:"Dr. Juan Dela Cruz", day:"Wednesday", start:"8:00 AM",  end:"6:00 PM" },
  { id:"S005", doctor:"Dr. Anna Reyes",     day:"Tuesday",   start:"10:00 AM", end:"6:00 PM" },
  { id:"S006", doctor:"Dr. Anna Reyes",     day:"Thursday",  start:"10:00 AM", end:"6:00 PM" },
];
