const BASE_URL = process.env.TEST_URL || "http://localhost:5000";

let user1Token = null;
let user2Token = null;
let user1Id = null;
let user2Id = null;
let testListingId = null;

const results = [];

function recordTest(name, passed, detail = "") {
  results.push({ name, passed, detail });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${passed ? "PASS" : "FAIL"}] ${name} ${detail ? "(" + detail + ")" : ""}`);
}

export async function runTests() {
  console.log(`\n==================================================`);
  console.log(`🧪 Running LocalConnect Phase 1 (IMP1) Backend Tests`);
  console.log(`Target Server: ${BASE_URL}`);
  console.log(`==================================================\n`);

  try {
    // 1. Health Check
    const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
    const healthData = await healthRes.json();
    recordTest("Health Check Endpoint", healthRes.status === 200 && healthData.success, `status: ${healthRes.status}`);

    // 2. User 1 Registration
    const timestamp = Date.now();
    const user1Email = `test_owner_${timestamp}@example.com`;
    const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Owner",
        email: user1Email,
        password: "password123",
        area: "Sector 1",
      }),
    });
    const signupData = await signupRes.json();
    if (signupRes.status === 201 && signupData.token) {
      user1Token = signupData.token;
      user1Id = signupData.user.id;
      recordTest("User 1 Registration", true, `Email: ${user1Email}`);
    } else {
      recordTest("User 1 Registration", false, signupData.error || `HTTP ${signupRes.status}`);
    }

    // 3. User 1 Login
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password: "password123",
      }),
    });
    const loginData = await loginRes.json();
    recordTest("User 1 Login", loginRes.status === 200 && !!loginData.token);

    // 4. Invalid Password Login Rejection
    const badLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user1Email,
        password: "wrongpassword",
      }),
    });
    recordTest("Reject Invalid Credentials", badLoginRes.status === 401);

    // 5. User 2 Registration (for ownership testing)
    const user2Email = `test_other_${timestamp}@example.com`;
    const signup2Res = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Other User",
        email: user2Email,
        password: "password123",
        area: "Sector 2",
      }),
    });
    const signup2Data = await signup2Res.json();
    if (signup2Res.status === 201 && signup2Data.token) {
      user2Token = signup2Data.token;
      user2Id = signup2Data.user.id;
      recordTest("User 2 Registration", true);
    } else {
      recordTest("User 2 Registration", false);
    }

    // 6. Create Room Listing (User 1)
    const roomRes = await fetch(`${BASE_URL}/api/v1/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        type: "room",
        title: "Test Single Room with Balcony",
        description: "Spacious room with high speed wifi",
        locality: "University North Gate",
        roomDetails: {
          rent: 6000,
          period: "month",
          amenities: ["WiFi", "Geyser"],
          verified: true,
        },
      }),
    });
    const roomData = await roomRes.json();
    if (roomRes.status === 201 && roomData.data?.id) {
      testListingId = roomData.data.id;
      recordTest("Create Room Listing", true, `ID: ${testListingId}`);
    } else {
      recordTest("Create Room Listing", false, roomData.error);
    }

    // 7. Create Vehicle Listing (User 1)
    const vehicleRes = await fetch(`${BASE_URL}/api/v1/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        type: "vehicle",
        title: "Hero Splendor Plus",
        description: "Great mileage, available for daily rental",
        locality: "Metro Station Gate 2",
        vehicleDetails: {
          vehicleType: "Bike",
          rentalPrice: 80,
          pricingPeriod: "hour",
          available: true,
        },
      }),
    });
    recordTest("Create Vehicle Listing", vehicleRes.status === 201);

    // 8. Create Lost & Found Listing (User 1)
    const lostRes = await fetch(`${BASE_URL}/api/v1/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        type: "lost_found",
        title: "Found: Black Leather Wallet",
        description: "Found on library bench with college ID card",
        locality: "Central Library 2nd Floor",
        lostFoundDetails: {
          kind: "found",
          itemName: "Leather Wallet",
        },
      }),
    });
    recordTest("Create Lost & Found Listing", lostRes.status === 201);

    // 9. Create Civil Help Service Listing (User 1)
    const serviceRes = await fetch(`${BASE_URL}/api/v1/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        type: "service",
        title: "Quick Fix Electrician Works",
        description: "Fan repair, MCB fix, wiring troubleshooting",
        locality: "Hostel Zone A",
        serviceDetails: {
          serviceCategory: "Electrician",
          pricingInfo: "₹150 inspection fee",
          rating: 4.9,
          jobsCount: 15,
          available: true,
        },
      }),
    });
    recordTest("Create Civil Help Listing", serviceRes.status === 201);

    // 10. Test Category Query Filtering (Independent Sections)
    const roomListRes = await fetch(`${BASE_URL}/api/v1/listings?type=room`);
    const roomListData = await roomListRes.json();
    const allRoomsMatch = roomListData.data?.every((item) => item.type === "room");
    recordTest("Filter Rooms (Category Isolation)", roomListRes.status === 200 && allRoomsMatch, `Count: ${roomListData.count}`);

    const vehicleListRes = await fetch(`${BASE_URL}/api/v1/listings?type=vehicle`);
    const vehicleListData = await vehicleListRes.json();
    const allVehiclesMatch = vehicleListData.data?.every((item) => item.type === "vehicle");
    recordTest("Filter Vehicles (Category Isolation)", vehicleListRes.status === 200 && allVehiclesMatch, `Count: ${vehicleListData.count}`);

    const lostListRes = await fetch(`${BASE_URL}/api/v1/listings?type=lost_found`);
    const lostListData = await lostListRes.json();
    const allLostMatch = lostListData.data?.every((item) => item.type === "lost_found");
    recordTest("Filter Lost & Found (Category Isolation)", lostListRes.status === 200 && allLostMatch, `Count: ${lostListData.count}`);

    const serviceListRes = await fetch(`${BASE_URL}/api/v1/listings?type=service`);
    const serviceListData = await serviceListRes.json();
    const allServicesMatch = serviceListData.data?.every((item) => item.type === "service");
    recordTest("Filter Civil Help (Category Isolation)", serviceListRes.status === 200 && allServicesMatch, `Count: ${serviceListData.count}`);

    // 11. Security Check: Unauthorized user attempting to edit User 1's listing (MUST FAIL with 403)
    const unauthorizedEditRes = await fetch(`${BASE_URL}/api/v1/listings/${testListingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        title: "Hacked Title by Unauthorized User",
      }),
    });
    recordTest(
      "Deny Unauthorized Edit (Ownership Protection)",
      unauthorizedEditRes.status === 403,
      `Expected 403, got ${unauthorizedEditRes.status}`
    );

    // 12. Authorized Edit: User 1 editing their own listing (MUST SUCCEED with 200)
    const authorizedEditRes = await fetch(`${BASE_URL}/api/v1/listings/${testListingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        title: "Updated: Single Room with Balcony (Rent Reduced)",
        roomDetails: {
          rent: 5500,
          period: "month",
        },
      }),
    });
    const authorizedEditData = await authorizedEditRes.json();
    recordTest(
      "Permit Owner Edit",
      authorizedEditRes.status === 200 && authorizedEditData.data?.title?.includes("Updated"),
      `Title: ${authorizedEditData.data?.title}`
    );

    // 13. Security Check: Unauthorized user attempting to delete User 1's listing (MUST FAIL with 403)
    const unauthorizedDeleteRes = await fetch(`${BASE_URL}/api/v1/listings/${testListingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });
    recordTest(
      "Deny Unauthorized Delete (Ownership Protection)",
      unauthorizedDeleteRes.status === 403,
      `Expected 403, got ${unauthorizedDeleteRes.status}`
    );

    // 14. Authorized Delete: User 1 deleting their own listing (MUST SUCCEED with 200)
    const authorizedDeleteRes = await fetch(`${BASE_URL}/api/v1/listings/${testListingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    recordTest("Permit Owner Delete", authorizedDeleteRes.status === 200);

    // 15. Mobile Upload Route Contract Check (Route exists & enforces requireAuth)
    const uploadRouteCheck = await fetch(`${BASE_URL}/api/v1/upload`, {
      method: "POST",
    });
    recordTest(
      "Mobile /api/v1/upload Route Exists & Protected",
      uploadRouteCheck.status === 401,
      `Expected 401, got ${uploadRouteCheck.status}`
    );

    // 16. Rate Limiter Security Headers on Auth Routes
    const authHeadersCheck = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@example.com", password: "wrong" }),
    });
    const hasRateLimitHeader = authHeadersCheck.headers.has("x-ratelimit-limit");
    recordTest(
      "Auth Rate Limiter Protection Headers Active",
      hasRateLimitHeader,
      `Limit: ${authHeadersCheck.headers.get("x-ratelimit-limit")}`
    );

    // Summary
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`\n==================================================`);
    console.log(`Test Summary: ${passedCount}/${results.length} Tests Passed`);
    console.log(`==================================================\n`);

    if (passedCount === results.length) {
      console.log("🎉 ALL BACKEND API & SECURITY TESTS PASSED!");
      return true;
    } else {
      console.error("⚠️ Some tests failed. Please review above output.");
      return false;
    }
  } catch (err) {
    console.error("❌ Test runner error:", err);
    return false;
  }
}

// Run immediately only if executed directly
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("server/test-api.js")) {
  runTests().then((passed) => process.exit(passed ? 0 : 1));
}
