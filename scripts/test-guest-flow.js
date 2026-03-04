// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_URL = "http://localhost:5000/api";
const GRAPHQL_URL = "http://localhost:5000/graphql";

async function testGuestWorkflow() {
  console.log("🚀 Starting Guest Workflow Test...");
  try {
    // 1. Register Guest
    const guestUser = {
      email: `guest_flow_${Date.now()}@example.com`,
      password: "password123",
      firstName: "Guest",
      lastName: "Flow",
      role: "guest",
    };

    let res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guestUser),
    });
    let data = await res.json();
    if (!data.success) throw new Error(`Registration failed: ${data.message}`);
    const token = data.data.token;
    console.log("✅ Guest Registered");

    // 2. Create Reservation
    const reservationInput = {
      guestName: "Guest Flow",
      contactEmail: guestUser.email,
      contactPhone: "1234567890",
      expectedArrivalTime: new Date(Date.now() + 86400000 * 2).toISOString(),
      tableSize: 4,
    };

    const createMutation = `
      mutation CreateReservation($input: CreateReservationInput!) {
        createReservation(input: $input) {
          id
          status
        }
      }
    `;

    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: createMutation,
        variables: { input: reservationInput },
      }),
    });
    data = await res.json();
    if (data.errors)
      throw new Error(
        `Create Reservation failed: ${JSON.stringify(data.errors)}`,
      );
    const reservationId = data.data.createReservation.id;
    console.log(`✅ Reservation Created: ${reservationId}`);

    // 3. Cancel Reservation (Allowed if Requested & > 24h)
    const cancelMutation = `
      mutation CancelMyReservation($id: ID!) {
        cancelMyReservation(id: $id) {
          id
          status
        }
      }
    `;

    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: cancelMutation,
        variables: { id: reservationId },
      }),
    });
    data = await res.json();
    if (data.errors)
      throw new Error(
        `Cancel Reservation failed: ${JSON.stringify(data.errors)}`,
      );
    if (data.data.cancelMyReservation.status !== "Cancelled")
      throw new Error("Status not Cancelled");
    console.log("✅ Reservation Cancelled by Guest");
  } catch (error) {
    console.error("❌ Guest Workflow Failed:", error.message);
    process.exit(1);
  }
}

testGuestWorkflow();
