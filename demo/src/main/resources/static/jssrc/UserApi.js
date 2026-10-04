// Shared API helper for talking to the Spring Boot backend.
// Assumes login (POST /api/auth/login) stores the token and user id like:
//   localStorage.setItem("token", data.token);
//   localStorage.setItem("userId", data.user.id);

const API_BASE = ""; // same-origin; change this if the backend lives on a different host/port

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Accept": "application/json", ...authHeaders() }
    });
    if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status}`);
    }
    return res.json();
}

function getCurrentUserId() {
    const id = localStorage.getItem("userId");
    if (!id) throw new Error("Not logged in");
    return id;
}

async function getUser(userId) {
    return apiGet(`/api/users/${userId}`);
}

async function getFollowerCount(userId) {
    const followers = await getFollowers(userId);
    return followers.length;
}

async function getFollowingCount(userId) {
    const following = await getFollowing(userId);
    return following.length;
}

async function getPostCountForUser(userId) {
    const posts = await getPostsForUser(userId);
    return posts.length;
}

async function getPostsForUser(userId) {
    // Backend has no per-user blog endpoint, so we fetch all blogs and filter client-side
    // rather than changing BlogController.
    const allBlogs = await apiGet(`/api/blogs`);
    return allBlogs
        .filter(blog => blog.userId === Number(userId))
        .sort((a, b) => b.date.localeCompare(a.date)); // newest first (dates are YYYY-MM-DD strings)
}

async function getFollowers(userId) {
    // Kept separate from getFollowing on purpose — they hit different endpoints
    // (/api/follows/followers vs /api/follows/following) and return different things.
    return apiGet(`/api/follows/followers?followedId=${userId}`);
}

async function getFollowing(userId) {
    return apiGet(`/api/follows/following?followerId=${userId}`);
}

// Resolves the raw follow records from getFollowing() into full user objects
// (so the popup has usernames to show, not just ids).
// Confirmed against Follow.java: fields serialize as "followerId"/"followedId".
async function getFollowingUsers(userId) {
    const follows = await getFollowing(userId);
    const users = await Promise.all(follows.map(f => getUser(f.followedId)));
    return users;
}

// Same idea, but for the people following this user.
async function getFollowersUsers(userId) {
    const followers = await getFollowers(userId);
    const users = await Promise.all(followers.map(f => getUser(f.followerId)));
    return users;
}

// Creates a new blog/post for the currently logged-in user.
// BlogController.create() returns a plain string ("blog created succesfully"),
// not JSON, so this reads the response with .text(), not .json().
async function createPost(content) {
    const userId = getCurrentUserId(); // throws "Not logged in" if no session
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, matches existing date format in blogs table

    const res = await fetch(`${API_BASE}/api/blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
            userId: Number(userId),
            content: content,
            date: date
        })
    });

    if (!res.ok) {
        throw new Error(`POST /api/blogs failed: ${res.status}`);
    }

    return res.text();
}