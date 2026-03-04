// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_URL = "http://localhost:5000/api";
const GRAPHQL_URL = "http://localhost:5000/graphql";

async function testEmployeeWorkflow() {
  console.log("🚀 Starting Employee Workflow Test...");
  try {
    // 1. Register Employee
    const empUser = {
      email: `emp_flow_${Date.now()}@example.com`,
      password: "password123",
      firstName: "Emp",
      lastName: "Flow",
      role: "employee",
    };

    let res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(empUser),
    });
    let data = await res.json();
    if (!data.success)
      throw new Error(`Employee Registration failed: ${data.message}`);
    const empToken = data.data.token;
    console.log("✅ Employee Registered");

    // 2. Register Guest & Create Reservation (to be managed)
    const guestUser = {
      email: `guest_managed_${Date.now()}@example.com`,
      password: "password123",
      firstName: "Guest",
      lastName: "Managed",
      role: "guest",
    };
    res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guestUser),
    });
    data = await res.json();
    const guestToken = data.data.token;

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
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        query: createMutation,
        variables: {
          input: {
            guestName: "Managed Guest",
            contactEmail: guestUser.email,
            contactPhone: "1234567890",
            expectedArrivalTime: new Date(
              Date.now() + 86400000 * 2,
            ).toISOString(),
            tableSize: 2,
          },
        },
      }),
    });
    data = await res.json();
    const reservationId = data.data.createReservation.id;
    console.log(`✅ Guest Reservation Created: ${reservationId}`);

    // 3. Employee Approves Reservation
    const updateMutation = `
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
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        query: updateMutation,
        variables: { id: reservationId, status: "Approved" },
      }),
    });
    data = await res.json();
    if (data.errors)
      throw new Error(
        `Approve Reservation failed: ${JSON.stringify(data.errors)}`,
      );
    if (data.data.updateReservationStatus.status !== "Approved")
      throw new Error("Status not Approved");
    console.log("✅ Reservation Approved by Employee");

    // 4. Employee Completes Reservation
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        query: updateMutation,
        variables: { id: reservationId, status: "Completed" },
      }),
    });
    data = await res.json();
    if (data.errors)
      throw new Error(
        `Complete Reservation failed: ${JSON.stringify(data.errors)}`,
      );
    if (data.data.updateReservationStatus.status !== "Completed")
      throw new Error("Status not Completed");
    console.log("✅ Reservation Completed by Employee");
  } catch (error) {
    console.error("❌ Employee Workflow Failed:", error.message);
    process.exit(1);
  }
}

testEmployeeWorkflow();
