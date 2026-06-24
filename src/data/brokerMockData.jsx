// Mock Data for SSK Logistics Broker Dashboard

export const brokerProfile = {
  businessName: "Suresh Transport Co.",
  ownerName: "Suresh Patel",
  phone: "+91 90000 00003",
  email: "suresh@ssklogistics.in",
  gst: "27AABCU9603R1ZX",
  address: "Plot 45, Transport Nagar",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  bankName: "HDFC Bank",
  accountNumber: "XXXX XXXX 4521",
  ifsc: "HDFC0001234",
  subscription: "Free",
  avatar: null,
};

export const trucks = [
  { id: 1, registration: "MH-12-AB-4521", type: "Medium", capacity: "5 Tons", make: "Tata 407", year: 2021, insuranceExpiry: "2025-08-15", status: "Available", driverId: 1, lastTrip: "Pune → Mumbai" },
  { id: 2, registration: "MH-12-CD-7845", type: "Large", capacity: "10 Tons", make: "Ashok Leyland 3118", year: 2020, insuranceExpiry: "2025-06-20", status: "On Trip", driverId: 2, lastTrip: "Mumbai → Ahmedabad" },
  { id: 3, registration: "MH-12-EF-1234", type: "Small", capacity: "2 Tons", make: "Mahindra Jeeto", year: 2023, insuranceExpiry: "2026-01-10", status: "Available", driverId: 3, lastTrip: "Pune → Nashik" },
  { id: 4, registration: "MH-12-GH-5678", type: "Medium", capacity: "7 Tons", make: "Eicher Pro 2075", year: 2022, insuranceExpiry: "2025-09-30", status: "On Trip", driverId: 4, lastTrip: "Pune → Bangalore" },
  { id: 5, registration: "MH-12-IJ-9012", type: "Large", capacity: "12 Tons", make: "Tata LPT 3118", year: 2019, insuranceExpiry: "2025-05-15", status: "Maintenance", driverId: null, lastTrip: "Mumbai → Delhi" },
  { id: 6, registration: "MH-12-KL-3456", type: "Small", capacity: "1.5 Tons", make: "Tata Ace Gold", year: 2023, insuranceExpiry: "2026-03-22", status: "Available", driverId: 5, lastTrip: "Pune → Kolhapur" },
  { id: 7, registration: "MH-12-MN-7890", type: "Medium", capacity: "6 Tons", make: "BharatBenz 1217R", year: 2021, insuranceExpiry: "2025-11-18", status: "Available", driverId: 6, lastTrip: "Pune → Nagpur" },
  { id: 8, registration: "MH-12-OP-2345", type: "Large", capacity: "9 Tons", make: "Ashok Leyland 2518", year: 2020, insuranceExpiry: "2025-07-08", status: "On Trip", driverId: 7, lastTrip: "Mumbai → Hyderabad" },
  { id: 9, registration: "MH-12-QR-6789", type: "Medium", capacity: "5 Tons", make: "Tata 407", year: 2022, insuranceExpiry: "2026-02-14", status: "Available", driverId: 8, lastTrip: "Pune → Aurangabad" },
  { id: 10, registration: "MH-12-ST-0123", type: "Small", capacity: "2 Tons", make: "Mahindra Supro", year: 2023, insuranceExpiry: "2026-04-01", status: "Available", driverId: null, lastTrip: "Pune → Satara" },
  { id: 11, registration: "MH-12-UV-4567", type: "Large", capacity: "15 Tons", make: "Tata Prima 3525", year: 2019, insuranceExpiry: "2025-04-20", status: "Maintenance", driverId: null, lastTrip: "Mumbai → Chennai" },
  { id: 12, registration: "MH-12-WX-8901", type: "Medium", capacity: "8 Tons", make: "Eicher Pro 3015", year: 2021, insuranceExpiry: "2025-10-05", status: "Available", driverId: null, lastTrip: "Pune → Solapur" },
];

export const drivers = [
  { id: 1, name: "Ramesh Yadav", phone: "+91 98765 43210", licenseNo: "MH12-2021-0012345", aadhaar: "XXXX-XXXX-3456", kycStatus: "Verified", truckId: 1, status: "Active", totalTrips: 234, licenseExpiry: "2027-03-15", avatar: "/images/driver-1.jpg" },
  { id: 2, name: "Mohan Singh", phone: "+91 98765 43211", licenseNo: "MH12-2020-0023456", aadhaar: "XXXX-XXXX-7890", kycStatus: "Verified", truckId: 2, status: "Active", totalTrips: 189, licenseExpiry: "2026-08-20", avatar: "/images/driver-2.jpg" },
  { id: 3, name: "Vijay Kumar", phone: "+91 98765 43212", licenseNo: "MH12-2023-0034567", aadhaar: "XXXX-XXXX-1234", kycStatus: "Verified", truckId: 3, status: "Active", totalTrips: 67, licenseExpiry: "2028-01-10", avatar: "/images/driver-3.jpg" },
  { id: 4, name: "Deepak Sharma", phone: "+91 98765 43213", licenseNo: "MH12-2022-0045678", aadhaar: "XXXX-XXXX-5678", kycStatus: "Verified", truckId: 4, status: "Active", totalTrips: 156, licenseExpiry: "2027-06-25", avatar: "/images/driver-4.jpg" },
  { id: 5, name: "Sanjay Patil", phone: "+91 98765 43214", licenseNo: "MH12-2023-0056789", aadhaar: "XXXX-XXXX-9012", kycStatus: "Pending", truckId: 6, status: "Active", totalTrips: 45, licenseExpiry: "2028-09-14", avatar: "/images/driver-1.jpg" },
  { id: 6, name: "Ajay Gupta", phone: "+91 98765 43215", licenseNo: "MH12-2021-0067890", aadhaar: "XXXX-XXXX-2345", kycStatus: "Verified", truckId: 7, status: "Active", totalTrips: 198, licenseExpiry: "2027-11-30", avatar: "/images/driver-2.jpg" },
  { id: 7, name: "Prakash Reddy", phone: "+91 98765 43216", licenseNo: "MH12-2020-0078901", aadhaar: "XXXX-XXXX-6789", kycStatus: "Verified", truckId: 8, status: "Active", totalTrips: 267, licenseExpiry: "2026-05-18", avatar: "/images/driver-3.jpg" },
  { id: 8, name: "Nitin Joshi", phone: "+91 98765 43217", licenseNo: "MH12-2022-0089012", aadhaar: "XXXX-XXXX-0123", kycStatus: "Pending", truckId: 9, status: "Active", totalTrips: 123, licenseExpiry: "2027-12-05", avatar: "/images/driver-4.jpg" },
];

export const jobRequests = [
  { id: 1, bookingId: "SSK-2026-0619-001", clientName: "Rajesh K.", clientPhone: "+91 91234 56789", pickup: "Pune - Hadapsar Industrial Area", drop: "Mumbai - Bhiwandi Warehouse", distance: 145, truckType: "Medium", weight: "5 Tons", amount: 8500, expiresIn: 18, timestamp: "2 min ago" },
  { id: 2, bookingId: "SSK-2026-0619-002", clientName: "Anil M.", clientPhone: "+91 92345 67890", pickup: "Pune - Chakan MIDC", drop: "Nashik - Satpur Industrial Area", distance: 210, truckType: "Large", weight: "10 Tons", amount: 12500, expiresIn: 25, timestamp: "5 min ago" },
  { id: 3, bookingId: "SSK-2026-0619-003", clientName: "Sunil R.", clientPhone: "+91 93456 78901", pickup: "Pune - Ranjangaon MIDC", drop: "Ahmedabad - Changodar", distance: 520, truckType: "Medium", weight: "7 Tons", amount: 18200, expiresIn: 32, timestamp: "12 min ago" },
];

export const activeJobs = [
  { id: 1, bookingId: "SSK-2026-0618-015", clientName: "Vikram Industries", pickup: "Pune - Talegaon MIDC, Gate 3", drop: "Bangalore - Peenya Industrial Area", distance: 840, truckId: 4, driverId: 4, status: "In Transit", amount: 42500, timeline: [{ step: "Pickup", done: true, time: "06:30 AM" }, { step: "In Transit", done: true, time: "Current" }, { step: "Delivered", done: false, time: "Expected 8:00 PM" }] },
  { id: 2, bookingId: "SSK-2026-0618-020", clientName: "Patil Traders", pickup: "Mumbai - Bhiwandi Godown 7", drop: "Ahmedabad - Naroda GIDC", distance: 510, truckId: 2, driverId: 2, status: "Loading", amount: 28500, timeline: [{ step: "Pickup", done: true, time: "08:00 AM" }, { step: "In Transit", done: false, time: "Expected 10:00 AM" }, { step: "Delivered", done: false, time: "Expected 6:00 PM" }] },
  { id: 3, bookingId: "SSK-2026-0619-005", clientName: " Sharma Logistics", pickup: "Pune - Chakan Phase 2", drop: "Indore - Pithampur Industrial Area", distance: 580, truckId: 8, driverId: 7, status: "In Transit", amount: 32100, timeline: [{ step: "Pickup", done: true, time: "05:00 AM" }, { step: "In Transit", done: true, time: "Current" }, { step: "Delivered", done: false, time: "Expected 9:00 PM" }] },
  { id: 4, bookingId: "SSK-2026-0619-008", clientName: "Mehta Enterprises", pickup: "Mumbai - Nhava Sheva Port", drop: "Hyderabad - Shamshabad", distance: 710, truckId: null, driverId: null, status: "Pending Assignment", amount: 38400, timeline: [{ step: "Pickup", done: false, time: "Expected 11:00 AM" }, { step: "In Transit", done: false, time: "" }, { step: "Delivered", done: false, time: "Expected 10:00 PM" }] },
];

export const jobHistory = [
  { id: 1, bookingId: "SSK-2026-0617-042", route: "Pune → Mumbai", truck: "MH-12-AB-4521", driver: "Ramesh Yadav", date: "2026-06-17", amount: 8500, platformFee: 850, netEarnings: 7650, status: "Completed" },
  { id: 2, bookingId: "SSK-2026-0617-038", route: "Mumbai → Ahmedabad", truck: "MH-12-CD-7845", driver: "Mohan Singh", date: "2026-06-17", amount: 15200, platformFee: 1520, netEarnings: 13680, status: "Completed" },
  { id: 3, bookingId: "SSK-2026-0616-029", route: "Pune → Nashik", truck: "MH-12-EF-1234", driver: "Vijay Kumar", date: "2026-06-16", amount: 6200, platformFee: 620, netEarnings: 5580, status: "Completed" },
  { id: 4, bookingId: "SSK-2026-0616-025", route: "Pune → Bangalore", truck: "MH-12-GH-5678", driver: "Deepak Sharma", date: "2026-06-16", amount: 42100, platformFee: 4210, netEarnings: 37890, status: "Completed" },
  { id: 5, bookingId: "SSK-2026-0615-021", route: "Mumbai → Pune", truck: "MH-12-AB-4521", driver: "Ramesh Yadav", date: "2026-06-15", amount: 7800, platformFee: 780, netEarnings: 7020, status: "Completed" },
  { id: 6, bookingId: "SSK-2026-0615-018", route: "Pune → Nagpur", truck: "MH-12-MN-7890", driver: "Ajay Gupta", date: "2026-06-15", amount: 28500, platformFee: 2850, netEarnings: 25650, status: "Completed" },
  { id: 7, bookingId: "SSK-2026-0614-014", route: "Pune → Aurangabad", truck: "MH-12-QR-6789", driver: "Nitin Joshi", date: "2026-06-14", amount: 9200, platformFee: 920, netEarnings: 8280, status: "Completed" },
  { id: 8, bookingId: "SSK-2026-0614-011", route: "Mumbai → Hyderabad", truck: "MH-12-OP-2345", driver: "Prakash Reddy", date: "2026-06-14", amount: 36800, platformFee: 3680, netEarnings: 33120, status: "Completed" },
  { id: 9, bookingId: "SSK-2026-0613-008", route: "Pune → Mumbai", truck: "MH-12-EF-1234", driver: "Vijay Kumar", date: "2026-06-13", amount: 7100, platformFee: 710, netEarnings: 6390, status: "Cancelled" },
  { id: 10, bookingId: "SSK-2026-0613-005", route: "Pune → Kolhapur", truck: "MH-12-KL-3456", driver: "Sanjay Patil", date: "2026-06-13", amount: 8500, platformFee: 850, netEarnings: 7650, status: "Completed" },
  { id: 11, bookingId: "SSK-2026-0612-001", route: "Mumbai → Ahmedabad", truck: "MH-12-CD-7845", driver: "Mohan Singh", date: "2026-06-12", amount: 14800, platformFee: 1480, netEarnings: 13320, status: "Completed" },
  { id: 12, bookingId: "SSK-2026-0611-098", route: "Pune → Nashik", truck: "MH-12-AB-4521", driver: "Ramesh Yadav", date: "2026-06-11", amount: 6500, platformFee: 650, netEarnings: 5850, status: "Completed" },
  { id: 13, bookingId: "SSK-2026-0611-095", route: "Pune → Bangalore", truck: "MH-12-GH-5678", driver: "Deepak Sharma", date: "2026-06-11", amount: 43500, platformFee: 4350, netEarnings: 39150, status: "Completed" },
  { id: 14, bookingId: "SSK-2026-0610-088", route: "Mumbai → Delhi", truck: "MH-12-IJ-9012", driver: "Ajay Gupta", date: "2026-06-10", amount: 52100, platformFee: 5210, netEarnings: 46890, status: "Completed" },
  { id: 15, bookingId: "SSK-2026-0610-082", route: "Pune → Solapur", truck: "MH-12-WX-8901", driver: "Nitin Joshi", date: "2026-06-10", amount: 7800, platformFee: 780, netEarnings: 7020, status: "Completed" },
  { id: 16, bookingId: "SSK-2026-0609-075", route: "Pune → Nagpur", truck: "MH-12-MN-7890", driver: "Ajay Gupta", date: "2026-06-09", amount: 29200, platformFee: 2920, netEarnings: 26280, status: "Completed" },
  { id: 17, bookingId: "SSK-2026-0609-071", route: "Mumbai → Hyderabad", truck: "MH-12-OP-2345", driver: "Prakash Reddy", date: "2026-06-09", amount: 37400, platformFee: 3740, netEarnings: 33660, status: "Completed" },
  { id: 18, bookingId: "SSK-2026-0608-065", route: "Pune → Aurangabad", truck: "MH-12-QR-6789", driver: "Sanjay Patil", date: "2026-06-08", amount: 9100, platformFee: 910, netEarnings: 8190, status: "Cancelled" },
  { id: 19, bookingId: "SSK-2026-0608-062", route: "Pune → Mumbai", truck: "MH-12-EF-1234", driver: "Vijay Kumar", date: "2026-06-08", amount: 7200, platformFee: 720, netEarnings: 6480, status: "Completed" },
  { id: 20, bookingId: "SSK-2026-0607-058", route: "Mumbai → Ahmedabad", truck: "MH-12-CD-7845", driver: "Mohan Singh", date: "2026-06-07", amount: 15100, platformFee: 1510, netEarnings: 13590, status: "Completed" },
  { id: 21, bookingId: "SSK-2026-0607-055", route: "Pune → Bangalore", truck: "MH-12-GH-5678", driver: "Deepak Sharma", date: "2026-06-07", amount: 42800, platformFee: 4280, netEarnings: 38520, status: "Completed" },
  { id: 22, bookingId: "SSK-2026-0606-048", route: "Pune → Nashik", truck: "MH-12-AB-4521", driver: "Ramesh Yadav", date: "2026-06-06", amount: 6400, platformFee: 640, netEarnings: 5760, status: "Completed" },
  { id: 23, bookingId: "SSK-2026-0606-045", route: "Pune → Kolhapur", truck: "MH-12-KL-3456", driver: "Nitin Joshi", date: "2026-06-06", amount: 8800, platformFee: 880, netEarnings: 7920, status: "Completed" },
  { id: 24, bookingId: "SSK-2026-0605-038", route: "Mumbai → Delhi", truck: "MH-12-IJ-9012", driver: "Ajay Gupta", date: "2026-06-05", amount: 53500, platformFee: 5350, netEarnings: 48150, status: "Completed" },
  { id: 25, bookingId: "SSK-2026-0605-035", route: "Pune → Solapur", truck: "MH-12-WX-8901", driver: "Sanjay Patil", date: "2026-06-05", amount: 7500, platformFee: 750, netEarnings: 6750, status: "Completed" },
  { id: 26, bookingId: "SSK-2026-0604-028", route: "Pune → Nagpur", truck: "MH-12-MN-7890", driver: "Ajay Gupta", date: "2026-06-04", amount: 28800, platformFee: 2880, netEarnings: 25920, status: "Completed" },
  { id: 27, bookingId: "SSK-2026-0604-025", route: "Mumbai → Hyderabad", truck: "MH-12-OP-2345", driver: "Prakash Reddy", date: "2026-06-04", amount: 38100, platformFee: 3810, netEarnings: 34290, status: "Completed" },
  { id: 28, bookingId: "SSK-2026-0603-018", route: "Pune → Aurangabad", truck: "MH-12-QR-6789", driver: "Ramesh Yadav", date: "2026-06-03", amount: 9400, platformFee: 940, netEarnings: 8460, status: "Completed" },
  { id: 29, bookingId: "SSK-2026-0603-015", route: "Pune → Mumbai", truck: "MH-12-EF-1234", driver: "Vijay Kumar", date: "2026-06-03", amount: 6900, platformFee: 690, netEarnings: 6210, status: "Completed" },
  { id: 30, bookingId: "SSK-2026-0602-008", route: "Mumbai → Ahmedabad", truck: "MH-12-CD-7845", driver: "Mohan Singh", date: "2026-06-02", amount: 14900, platformFee: 1490, netEarnings: 13410, status: "Completed" },
];

export const earningsData = [
  { date: "2026-06-01", bookingId: "SSK-2026-0601-002", route: "Pune → Mumbai", amount: 8500, platformFee: 850, net: 7650, status: "Paid" },
  { date: "2026-06-01", bookingId: "SSK-2026-0601-005", route: "Mumbai → Ahmedabad", amount: 15200, platformFee: 1520, net: 13680, status: "Paid" },
  { date: "2026-06-02", bookingId: "SSK-2026-0602-008", route: "Mumbai → Ahmedabad", amount: 14900, platformFee: 1490, net: 13410, status: "Paid" },
  { date: "2026-06-02", bookingId: "SSK-2026-0602-012", route: "Pune → Nashik", amount: 6200, platformFee: 620, net: 5580, status: "Paid" },
  { date: "2026-06-03", bookingId: "SSK-2026-0603-015", route: "Pune → Mumbai", amount: 6900, platformFee: 690, net: 6210, status: "Paid" },
  { date: "2026-06-03", bookingId: "SSK-2026-0603-018", route: "Pune → Aurangabad", amount: 9400, platformFee: 940, net: 8460, status: "Paid" },
  { date: "2026-06-04", bookingId: "SSK-2026-0604-025", route: "Mumbai → Hyderabad", amount: 38100, platformFee: 3810, net: 34290, status: "Paid" },
  { date: "2026-06-04", bookingId: "SSK-2026-0604-028", route: "Pune → Nagpur", amount: 28800, platformFee: 2880, net: 25920, status: "Paid" },
  { date: "2026-06-05", bookingId: "SSK-2026-0605-035", route: "Pune → Solapur", amount: 7500, platformFee: 750, net: 6750, status: "Paid" },
  { date: "2026-06-05", bookingId: "SSK-2026-0605-038", route: "Mumbai → Delhi", amount: 53500, platformFee: 5350, net: 48150, status: "Paid" },
  { date: "2026-06-06", bookingId: "SSK-2026-0606-045", route: "Pune → Kolhapur", amount: 8800, platformFee: 880, net: 7920, status: "Paid" },
  { date: "2026-06-06", bookingId: "SSK-2026-0606-048", route: "Pune → Nashik", amount: 6400, platformFee: 640, net: 5760, status: "Paid" },
  { date: "2026-06-07", bookingId: "SSK-2026-0607-055", route: "Pune → Bangalore", amount: 42800, platformFee: 4280, net: 38520, status: "Paid" },
  { date: "2026-06-07", bookingId: "SSK-2026-0607-058", route: "Mumbai → Ahmedabad", amount: 15100, platformFee: 1510, net: 13590, status: "Paid" },
  { date: "2026-06-08", bookingId: "SSK-2026-0608-062", route: "Pune → Mumbai", amount: 7200, platformFee: 720, net: 6480, status: "Paid" },
  { date: "2026-06-09", bookingId: "SSK-2026-0609-071", route: "Mumbai → Hyderabad", amount: 37400, platformFee: 3740, net: 33660, status: "Pending" },
  { date: "2026-06-09", bookingId: "SSK-2026-0609-075", route: "Pune → Nagpur", amount: 29200, platformFee: 2920, net: 26280, status: "Pending" },
  { date: "2026-06-10", bookingId: "SSK-2026-0610-082", route: "Pune → Solapur", amount: 7800, platformFee: 780, net: 7020, status: "Pending" },
  { date: "2026-06-10", bookingId: "SSK-2026-0610-088", route: "Mumbai → Delhi", amount: 52100, platformFee: 5210, net: 46890, status: "Pending" },
  { date: "2026-06-11", bookingId: "SSK-2026-0611-095", route: "Pune → Bangalore", amount: 43500, platformFee: 4350, net: 39150, status: "Pending" },
  { date: "2026-06-11", bookingId: "SSK-2026-0611-098", route: "Pune → Nashik", amount: 6500, platformFee: 650, net: 5850, status: "Pending" },
  { date: "2026-06-12", bookingId: "SSK-2026-0612-001", route: "Mumbai → Ahmedabad", amount: 14800, platformFee: 1480, net: 13320, status: "Pending" },
  { date: "2026-06-13", bookingId: "SSK-2026-0613-005", route: "Pune → Kolhapur", amount: 8500, platformFee: 850, net: 7650, status: "Pending" },
  { date: "2026-06-14", bookingId: "SSK-2026-0614-011", route: "Mumbai → Hyderabad", amount: 36800, platformFee: 3680, net: 33120, status: "Pending" },
  { date: "2026-06-14", bookingId: "SSK-2026-0614-014", route: "Pune → Aurangabad", amount: 9200, platformFee: 920, net: 8280, status: "Pending" },
  { date: "2026-06-15", bookingId: "SSK-2026-0615-018", route: "Pune → Nagpur", amount: 28500, platformFee: 2850, net: 25650, status: "Pending" },
  { date: "2026-06-15", bookingId: "SSK-2026-0615-021", route: "Mumbai → Pune", amount: 7800, platformFee: 780, net: 7020, status: "Pending" },
  { date: "2026-06-16", bookingId: "SSK-2026-0616-025", route: "Pune → Bangalore", amount: 42100, platformFee: 4210, net: 37890, status: "Pending" },
  { date: "2026-06-16", bookingId: "SSK-2026-0616-029", route: "Pune → Nashik", amount: 6200, platformFee: 620, net: 5580, status: "Pending" },
  { date: "2026-06-17", bookingId: "SSK-2026-0617-038", route: "Mumbai → Ahmedabad", amount: 15200, platformFee: 1520, net: 13680, status: "Pending" },
  { date: "2026-06-17", bookingId: "SSK-2026-0617-042", route: "Pune → Mumbai", amount: 8500, platformFee: 850, net: 7650, status: "Pending" },
];

export const dailyEarnings = [
  { day: "Mon", revenue: 23700, expenses: 3200 },
  { day: "Tue", revenue: 21100, expenses: 2800 },
  { day: "Wed", revenue: 28300, expenses: 4100 },
  { day: "Thu", revenue: 25400, expenses: 3500 },
  { day: "Fri", revenue: 31200, expenses: 4800 },
  { day: "Sat", revenue: 19800, expenses: 2200 },
  { day: "Sun", revenue: 18400, expenses: 1900 },
];

export const weeklyJobs = [
  { week: "Week 1", jobs: 12 },
  { week: "Week 2", jobs: 15 },
  { week: "Week 3", jobs: 10 },
  { week: "Week 4", jobs: 14 },
];

export const fleetStatus = [
  { name: "Available", value: 7, color: "#17D86B" },
  { name: "On Trip", value: 3, color: "#1976FF" },
  { name: "Maintenance", value: 2, color: "#F59E0B" },
];

export const settlements = [
  { id: "STL-2026-0601", period: "Jun 1-15, 2026", amount: 85600, date: "2026-06-16", account: "HDFC - XXXX4521", status: "Paid" },
  { id: "STL-2026-0515", period: "May 16-31, 2026", amount: 72400, date: "2026-06-01", account: "HDFC - XXXX4521", status: "Paid" },
  { id: "STL-2026-0501", period: "May 1-15, 2026", amount: 91800, date: "2026-05-16", account: "HDFC - XXXX4521", status: "Paid" },
  { id: "STL-2026-0415", period: "Apr 16-30, 2026", amount: 68500, date: "2026-05-01", account: "HDFC - XXXX4521", status: "Paid" },
];

export const brokerKycDocs = [
  { name: "PAN Card", status: "Verified", uploadedDate: "2024-01-15", expiry: null },
  { name: "Aadhaar Card", status: "Verified", uploadedDate: "2024-01-15", expiry: null },
  { name: "GST Certificate", status: "Verified", uploadedDate: "2024-02-01", expiry: null },
  { name: "Bank Account Details", status: "Verified", uploadedDate: "2024-01-20", expiry: null },
  { name: "Business Registration", status: "Verified", uploadedDate: "2024-02-10", expiry: null },
];

export const vehicleDocs = trucks.map(t => ({
  truckReg: t.registration,
  rcBook: { status: "Valid", expiry: "2031-" + t.registration.split("-")[2] + "-15" },
  insurance: { status: new Date(t.insuranceExpiry) > new Date() ? "Valid" : "Expired", expiry: t.insuranceExpiry },
  fitness: { status: "Valid", expiry: "2026-12-31" },
  permit: { status: "Valid", expiry: "2027-06-30" },
  overallStatus: new Date(t.insuranceExpiry) > new Date() ? "Compliant" : "Action Required",
}));

export function getDriverById(id) {
  return drivers.find(d => d.id === id) || null;
}

export function getTruckById(id) {
  return trucks.find(t => t.id === id) || null;
}

export function formatCurrency(amount) {
  return "\u20B9" + amount.toLocaleString("en-IN");
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
