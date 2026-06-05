const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { 
  User, 
  Patient, 
  Appointment, 
  MedicalRecord, 
  PharmacyInventory, 
  Prescription, 
  Billing 
} = require('../models');

const seed = async () => {
  try {
    console.log('Synchronizing database models...');
    // Force sync database to clear old tables and start fresh
    await sequelize.sync({ force: true });
    console.log('Database synced successfully. Seeding data...');

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    // 1. Seed Users (5 Doctors + Admin + Nurse + Pharmacist + Billing)
    const usersData = [
      { name: 'System Admin', email: 'admin@hospital.com', password_hash: passwordHash, role: 'admin' },
      { name: 'Dr. Sarah Connor', email: 'sarah.connor@hospital.com', password_hash: passwordHash, role: 'doctor' },
      { name: 'Dr. John Watson', email: 'john.watson@hospital.com', password_hash: passwordHash, role: 'doctor' },
      { name: 'Dr. Gregory House', email: 'gregory.house@hospital.com', password_hash: passwordHash, role: 'doctor' },
      { name: 'Dr. Meredith Grey', email: 'meredith.grey@hospital.com', password_hash: passwordHash, role: 'doctor' },
      { name: 'Dr. Stephen Strange', email: 'stephen.strange@hospital.com', password_hash: passwordHash, role: 'doctor' },
      { name: 'Nurse Florence Nightingale', email: 'florence@hospital.com', password_hash: passwordHash, role: 'nurse' },
      { name: 'Pharmacist Alan Turing', email: 'pharmacist@hospital.com', password_hash: passwordHash, role: 'pharmacist' },
      { name: 'Billing Clerk Grace Hopper', email: 'billing@hospital.com', password_hash: passwordHash, role: 'billing' }
    ];

    const users = await User.bulkCreate(usersData, { returning: true });
    const doctors = users.filter(u => u.role === 'doctor');
    console.log(`Seeded ${users.length} users (including 5 doctors).`);

    // 2. Seed 20 Patients
    const patientsData = [
      { mrn: 'MRN-482910', first_name: 'James', last_name: 'Smith', dob: '1975-04-12', gender: 'Male', blood_group: 'A+', phone: '555-0192', email: 'james.smith@example.com', address: '123 Pine St, Seattle, WA', emergency_contact: 'Mary Smith (Wife) - 555-0193', insurance_id: 'INS-99210' },
      { mrn: 'MRN-784920', first_name: 'Linda', last_name: 'Johnson', dob: '1982-08-22', gender: 'Female', blood_group: 'O-', phone: '555-0210', email: 'linda.j@example.com', address: '456 Elm St, Seattle, WA', emergency_contact: 'Robert Johnson (Husband) - 555-0211', insurance_id: 'INS-44810' },
      { mrn: 'MRN-193029', first_name: 'Robert', last_name: 'Williams', dob: '1990-11-05', gender: 'Male', blood_group: 'B+', phone: '555-0301', email: 'robert.w@example.com', address: '789 Oak Ave, Bellevue, WA', emergency_contact: 'Jane Williams (Mother) - 555-0302', insurance_id: 'INS-22910' },
      { mrn: 'MRN-334910', first_name: 'Patricia', last_name: 'Brown', dob: '1968-01-15', gender: 'Female', blood_group: 'AB+', phone: '555-0456', email: 'pat.brown@example.com', address: '321 Maple Rd, Tacoma, WA', emergency_contact: 'William Brown (Son) - 555-0457', insurance_id: 'INS-88392' },
      { mrn: 'MRN-882019', first_name: 'Michael', last_name: 'Jones', dob: '1955-07-30', gender: 'Male', blood_group: 'O+', phone: '555-0912', email: 'mjones@example.com', address: '555 Birch Blvd, Redmond, WA', emergency_contact: 'Sarah Jones (Daughter) - 555-0913', insurance_id: 'INS-10291' },
      { mrn: 'MRN-554029', first_name: 'Elizabeth', last_name: 'Miller', dob: '1988-05-18', gender: 'Female', blood_group: 'A-', phone: '555-1212', email: 'emiller@example.com', address: '777 Cedar Ln, Kent, WA', emergency_contact: 'David Miller (Father) - 555-1213', insurance_id: 'INS-33491' },
      { mrn: 'MRN-902918', first_name: 'David', last_name: 'Davis', dob: '1992-03-25', gender: 'Male', blood_group: 'B-', phone: '555-8823', email: 'ddavis@example.com', address: '999 Willow Rd, Renton, WA', emergency_contact: 'Susan Davis (Sister) - 555-8824', insurance_id: 'INS-77291' },
      { mrn: 'MRN-112039', first_name: 'Jennifer', last_name: 'Garcia', dob: '1980-09-09', gender: 'Female', blood_group: 'O+', phone: '555-4512', email: 'jgarcia@example.com', address: '444 Spruce St, Seattle, WA', emergency_contact: 'Carlos Garcia (Brother) - 555-4513', insurance_id: 'INS-11291' },
      { mrn: 'MRN-338291', first_name: 'Maria', last_name: 'Rodriguez', dob: '1972-12-01', gender: 'Female', blood_group: 'A+', phone: '555-9012', email: 'mrodriguez@example.com', address: '222 Walnut Ct, Bellevue, WA', emergency_contact: 'Juan Rodriguez (Spouse) - 555-9013', insurance_id: 'INS-66291' },
      { mrn: 'MRN-667281', first_name: 'Charles', last_name: 'Wilson', dob: '1961-06-14', gender: 'Male', blood_group: 'O-', phone: '555-8899', email: 'cwilson@example.com', address: '888 Ash St, Tacoma, WA', emergency_contact: 'Dorothy Wilson (Wife) - 555-8900', insurance_id: 'INS-44392' },
      { mrn: 'MRN-223948', first_name: 'Joseph', last_name: 'Martinez', dob: '1985-02-28', gender: 'Male', blood_group: 'B+', phone: '555-7711', email: 'jmartinez@example.com', address: '159 Holly Ln, Olympia, WA', emergency_contact: 'Elena Martinez (Mother) - 555-7712', insurance_id: 'INS-33291' },
      { mrn: 'MRN-445920', first_name: 'Margaret', last_name: 'Anderson', dob: '1948-10-10', gender: 'Female', blood_group: 'AB-', phone: '555-6622', email: 'manderson@example.com', address: '357 Larch Pl, Seattle, WA', emergency_contact: 'Thomas Anderson (Son) - 555-6623', insurance_id: 'INS-99122' },
      { mrn: 'MRN-559281', first_name: 'Thomas', last_name: 'Taylor', dob: '1979-05-04', gender: 'Male', blood_group: 'A-', phone: '555-2244', email: 'ttaylor@example.com', address: '951 Hemlock Ave, Everett, WA', emergency_contact: 'Lucy Taylor (Wife) - 555-2245', insurance_id: 'INS-88192' },
      { mrn: 'MRN-882033', first_name: 'Dorothy', last_name: 'Thomas', dob: '1995-12-12', gender: 'Female', blood_group: 'O+', phone: '555-3355', email: 'dthomas@example.com', address: '753 Redwood Rd, Bellingham, WA', emergency_contact: 'Fred Thomas (Father) - 555-3356', insurance_id: 'INS-77281' },
      { mrn: 'MRN-993021', first_name: 'Christopher', last_name: 'Hernandez', dob: '1983-04-30', gender: 'Male', blood_group: 'B-', phone: '555-4466', email: 'chernandez@example.com', address: '124 Sycamore St, Vancouver, WA', emergency_contact: 'Sofia Hernandez (Sister) - 555-4467', insurance_id: 'INS-55281' },
      { mrn: 'MRN-102938', first_name: 'Karen', last_name: 'Moore', dob: '1965-07-15', gender: 'Female', blood_group: 'A+', phone: '555-5577', email: 'kmoore@example.com', address: '468 Magnolia Ct, Spokane, WA', emergency_contact: 'Jim Moore (Husband) - 555-5578', insurance_id: 'INS-10283' },
      { mrn: 'MRN-405928', first_name: 'Daniel', last_name: 'Martin', dob: '1991-09-02', gender: 'Male', blood_group: 'O-', phone: '555-6688', email: 'dmartin@example.com', address: '246 Poplar Way, Seattle, WA', emergency_contact: 'Arthur Martin (Father) - 555-6689', insurance_id: 'INS-44920' },
      { mrn: 'MRN-607281', first_name: 'Nancy', last_name: 'Jackson', dob: '1959-11-23', gender: 'Female', blood_group: 'B+', phone: '555-7799', email: 'njackson@example.com', address: '135 Cypress Pl, Bellevue, WA', emergency_contact: 'Keith Jackson (Spouse) - 555-7800', insurance_id: 'INS-88190' },
      { mrn: 'MRN-203918', first_name: 'Matthew', last_name: 'Thompson', dob: '1987-03-14', gender: 'Male', blood_group: 'A+', phone: '555-8800', email: 'mthompson@example.com', address: '369 Beech St, Seattle, WA', emergency_contact: 'Laura Thompson (Wife) - 555-8801', insurance_id: 'INS-22019' },
      { mrn: 'MRN-304928', first_name: 'Sandra', last_name: 'White', dob: '2001-01-20', gender: 'Female', blood_group: 'O+', phone: '555-9911', email: 'swhite@example.com', address: '258 Linden Dr, Bellevue, WA', emergency_contact: 'Nancy White (Mother) - 555-9912', insurance_id: 'INS-11029' }
    ];

    const patients = await Patient.bulkCreate(patientsData, { returning: true });
    console.log(`Seeded ${patients.length} patients.`);

    // 3. Seed 10 Pharmacy Inventory items
    const pharmacyData = [
      { drug_name: 'Acetaminophen 500mg', generic_name: 'Paracetamol', quantity: 500, unit: 'Tablets', reorder_level: 50, price: 0.15, expiry_date: '2027-12-31' },
      { drug_name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', quantity: 200, unit: 'Capsules', reorder_level: 40, price: 0.85, expiry_date: '2026-11-30' },
      { drug_name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', quantity: 300, unit: 'Tablets', reorder_level: 30, price: 0.20, expiry_date: '2027-06-30' },
      { drug_name: 'Lipitor 20mg', generic_name: 'Atorvastatin', quantity: 8, unit: 'Tablets', reorder_level: 15, price: 2.50, expiry_date: '2028-01-15' }, // Low Stock!
      { drug_name: 'Glucophage 500mg', generic_name: 'Metformin', quantity: 400, unit: 'Tablets', reorder_level: 50, price: 0.40, expiry_date: '2027-09-30' },
      { drug_name: 'Zestril 10mg', generic_name: 'Lisinopril', quantity: 150, unit: 'Tablets', reorder_level: 20, price: 0.60, expiry_date: '2027-03-31' },
      { drug_name: 'Prilosec 20mg', generic_name: 'Omeprazole', quantity: 5, unit: 'Capsules', reorder_level: 25, price: 1.10, expiry_date: '2026-08-31' }, // Low Stock!
      { drug_name: 'Norvasc 5mg', generic_name: 'Amlodipine', quantity: 250, unit: 'Tablets', reorder_level: 30, price: 0.45, expiry_date: '2028-02-28' },
      { drug_name: 'ProAir HFA', generic_name: 'Albuterol', quantity: 30, unit: 'Inhalers', reorder_level: 10, price: 15.00, expiry_date: '2026-10-31' },
      { drug_name: 'Neurontin 300mg', generic_name: 'Gabapentin', quantity: 180, unit: 'Capsules', reorder_level: 20, price: 0.95, expiry_date: '2027-05-31' }
    ];

    const drugs = await PharmacyInventory.bulkCreate(pharmacyData, { returning: true });
    console.log(`Seeded ${drugs.length} pharmacy items (including some low stock items).`);

    // 4. Seed 30 Appointments
    // Spread them: 10 past (completed), 10 today/upcoming (scheduled), 10 random future/cancelled.
    const appointmentsData = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const patient = patients[i % patients.length];
      const doctor = doctors[i % doctors.length];
      
      let scheduled_at = new Date(today);
      let status = 'scheduled';
      let notes = `Routine medical follow up check. Patient reported feeling standard.`;

      if (i < 10) {
        // 10 Completed Appointments (in the past)
        scheduled_at.setDate(today.getDate() - (10 - i));
        status = 'completed';
        notes = `Completed check-up. Patient symptoms addressed.`;
      } else if (i < 20) {
        // 10 Scheduled Appointments (today & tomorrow)
        scheduled_at.setDate(today.getDate() + (i - 12));
        scheduled_at.setHours(9 + (i % 8), 0, 0, 0); // working hours
        status = 'scheduled';
      } else {
        // 10 Mixed: Future / Cancelled
        scheduled_at.setDate(today.getDate() + (i - 15));
        status = i % 3 === 0 ? 'cancelled' : 'scheduled';
        notes = status === 'cancelled' ? 'Patient cancelled via phone call.' : 'Follow-up consultation.';
      }

      appointmentsData.push({
        patient_id: patient.id,
        doctor_id: doctor.id,
        scheduled_at,
        status,
        notes
      });
    }

    const appointments = await Appointment.bulkCreate(appointmentsData, { returning: true });
    console.log(`Seeded ${appointments.length} appointments.`);

    // 5. Seed Medical Records, Prescriptions, and Billing for Completed Appointments
    // We will auto-generate them for the first 10 appointments (which are 'completed')
    console.log('Generating medical records, prescriptions and bills for completed appointments...');
    const diagnoses = [
      { diag: 'Essential (primary) hypertension', icd: 'I10', drugIdx: 5, dosage: '1 tablet daily', freq: 'Morning', dur: 30 },
      { diag: 'Type 2 diabetes mellitus without complications', icd: 'E11.9', drugIdx: 4, dosage: '1 tablet twice daily', freq: 'With meals', dur: 90 },
      { diag: 'Acute upper respiratory infection, unspecified', icd: 'J06.9', drugIdx: 1, dosage: '1 capsule three times daily', freq: 'Every 8 hours', dur: 7 },
      { diag: 'Hyperlipidemia, unspecified', icd: 'E78.5', drugIdx: 3, dosage: '1 tablet daily at bedtime', freq: 'Nightly', dur: 30 },
      { diag: 'Gastro-esophageal reflux disease without esophagitis', icd: 'K21.9', drugIdx: 6, dosage: '1 capsule daily', freq: 'Before breakfast', dur: 14 }
    ];

    for (let i = 0; i < 10; i++) {
      const appt = appointments[i];
      const diagInfo = diagnoses[i % diagnoses.length];
      const drug = drugs[diagInfo.drugIdx];

      // Create Medical Record
      const record = await MedicalRecord.create({
        patient_id: appt.patient_id,
        doctor_id: appt.doctor_id,
        visit_date: appt.scheduled_at.toISOString().split('T')[0],
        diagnosis: diagInfo.diag,
        prescription: `Prescribed ${drug.drug_name} - ${diagInfo.dosage} for ${diagInfo.dur} days.`,
        icd10_code: diagInfo.icd,
        notes: `Checked vitals. Blood pressure stable. Prescribed appropriate medication.`
      });

      // Create Prescription
      await Prescription.create({
        record_id: record.id,
        drug_id: drug.id,
        dosage: diagInfo.dosage,
        frequency: diagInfo.freq,
        duration_days: diagInfo.dur,
        dispensed: i % 2 === 0 // 50% dispensed
      });

      // Create Bill
      const totalAmt = 150.00 + (parseFloat(drug.price) * diagInfo.dur);
      const paidAmt = i % 3 === 0 ? totalAmt : (i % 3 === 1 ? 50.00 : 0.00);
      const billStatus = paidAmt === totalAmt ? 'paid' : (paidAmt > 0 ? 'partial' : 'pending');

      await Billing.create({
        patient_id: appt.patient_id,
        appointment_id: appt.id,
        total_amount: totalAmt,
        paid_amount: paidAmt,
        status: billStatus,
        payment_method: paidAmt > 0 ? (i % 2 === 0 ? 'Insurance' : 'Credit Card') : null
      });
    }

    console.log('Seeded Medical Records, Prescriptions, and Billing records.');
    console.log('Database successfully seeded with demo dataset!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding database failed:', error);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  seed();
}

module.exports = seed;
