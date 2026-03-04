// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

const API_URL = "http://localhost:5000/api";
const GRAPHQL_URL = "http://localhost:5000/graphql";

async function testBackend() {
  console.log("🚀 Starting Backend Functional Test...");

  try {
    // --- 1. Register Guest ---
    const guestUser = {
      email: `guest_${Date.now()}@example.com`,
      password: "password123",
      firstName: "John",
      lastName: "Guest",
      phone: "1234567890",
      role: "guest",
    };

    console.log(`\n1. Registering Guest: ${guestUser.email}...`);
    let res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guestUser),
    });
    let data = await res.json();

    if (!data.success)
      throw new Error(
        `Guest Registration Failed: ${data.message || data.error}`,
      );
    const guestToken = data.data.token;
    console.log("✅ Guest Registered & Logged In");

    // --- 2. Create Reservation (Guest) ---
    console.log("\n2. Creating Reservation...");
    const reservationInput = {
      guestName: "John Guest",
      contactEmail: guestUser.email,
      contactPhone: guestUser.phone,
      expectedArrivalTime: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days later
      tableSize: 4,
      notes: "Window seat please",
    };

    const createReservationQuery = `
      mutation CreateReservation($input: CreateReservationInput!) {
        createReservation(input: $input) {
          id
          status
          guestName
        }
      }
    `;

    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        query: createReservationQuery,
        variables: { input: reservationInput },
      }),
    });
    data = await res.json();
    console.log("Create Reservation Response:", JSON.stringify(data, null, 2));

    if (data.errors)
      throw new Error(
        `Create Reservation Failed: ${JSON.stringify(data.errors)}`,
      );
    const reservationId = data.data.createReservation.id;
    console.log(`✅ Reservation Created: ID ${reservationId}`);

    // --- 3. Register Employee ---
    const employeeUser = {
      email: `emp_${Date.now()}@example.com`,
      password: "password123",
      firstName: "Jane",
      lastName: "Staff",
      role: "employee",
    };

    console.log(`\n3. Registering Employee: ${employeeUser.email}...`);
    res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeUser),
    });
    data = await res.json();

    if (!data.success)
      throw new Error(
        `Employee Registration Failed: ${data.message || data.error}`,
      );
    const employeeToken = data.data.token;
    console.log("✅ Employee Registered & Logged In");

    // --- 4. Employee: Approve Reservation ---
    console.log("\n4. Employee: Approving Reservation...");
    const updateStatusQuery = `
      mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!) {
        updateReservationStatus(id: $id, status: $status) {
          id
          status
        }
      }
    `;

    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        query: updateStatusQuery,
        variables: { id: reservationId, status: "Approved" },
      }),
    });
    data = await res.json();

    if (data.errors)
      throw new Error(`Update Status Failed: ${JSON.stringify(data.errors)}`);
    if (data.data.updateReservationStatus.status !== "Approved")
      throw new Error("Status not updated correctly");
    console.log("✅ Reservation Approved");

    // --- 5. Guest: Verify Status ---
    console.log("\n5. Guest: Verifying Status...");
    const getMyReservationsQuery = `
      query MyReservations {
        myReservations {
          reservations {
            id
            status
          }
        }
      }
    `;

    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        query: getMyReservationsQuery,
      }),
    });
    data = await res.json();

    if (data.errors)
      throw new Error(
        `Get My Reservations Failed: ${JSON.stringify(data.errors)}`,
      );
    const myReservation = data.data.myReservations.reservations.find(
      (r) => r.id === reservationId,
    );
    if (!myReservation) throw new Error("Reservation not found in guest list");
    if (myReservation.status !== "Approved")
      throw new Error(
        `Guest sees status ${myReservation.status}, expected Approved`,
      );
    console.log("✅ Guest sees Approved status");

    console.log("\n🎉 ALL TESTS PASSED!");
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
  }
}

testBackend();
