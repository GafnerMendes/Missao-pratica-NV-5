const API_BASE_URL = "http://localhost:3000/api";
let jwtToken = localStorage.getItem("jwtToken");

document.addEventListener("DOMContentLoaded", () => {
  updateLoginStatus();
});

function updateLoginStatus() {
  const userInfoDiv = document.getElementById("userInfo");
  const tokenDisplay = document.getElementById("jwtTokenDisplay");
  const loggedInUsernameEl = document.getElementById("loggedInUsername");
  const loggedInPerfilEl = document.getElementById("loggedInPerfil");

  if (jwtToken) {
    try {
      const payload = JSON.parse(atob(jwtToken.split(".")[1]));
      if (loggedInUsernameEl) loggedInUsernameEl.textContent = payload.username;
      if (loggedInPerfilEl) loggedInPerfilEl.textContent = payload.perfil;
      if (userInfoDiv) userInfoDiv.style.display = "block";
      if (tokenDisplay) {
        tokenDisplay.textContent = `Current JWT: ${jwtToken}`;
        tokenDisplay.style.display = "block";
      }
    } catch (e) {
      console.error("Error decoding token:", e);
      logoutUser(); 
    }
  } else {
    if (userInfoDiv) userInfoDiv.style.display = "none";
    if (tokenDisplay) tokenDisplay.style.display = "none";
  }
}

async function makeApiCall(
  endpoint,
  method = "GET",
  body = null,
  requiresAuth = true
) {
  const headers = { "Content-Type": "application/json" };
  if (requiresAuth && jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  } else if (requiresAuth && !jwtToken) {
    return {
      error: "No JWT token available. Please login.",
      status: 401,
      data: { message: "No JWT token available. Please login." },
    };
  }

  const config = {
    method: method,
    headers: headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    config.body = JSON.stringify(body);
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (method === "GET" && body) {
    const queryParams = new URLSearchParams(body).toString();
    if (queryParams) url += `?${queryParams}`;
  }

  try {
    const response = await fetch(url, config);
    const responseData = await response.json();
    if (!response.ok) {
      return {
        error: responseData.message || `HTTP error! Status: ${response.status}`,
        status: response.status,
        data: responseData,
      };
    }
    return responseData;
  } catch (error) {
    console.error("API Call Error:", error);
    return {
      error: error.message || "Network error or server is down.",
      status: 0,
      data: null,
    };
  }
}

async function loginUser(isAdmin = false) {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginResponseEl = document.getElementById("loginResponse");

  const username = isAdmin ? "admin" : usernameInput ? usernameInput.value : "";
  const password = isAdmin
    ? "123456789"
    : passwordInput
    ? passwordInput.value
    : "";

  const result = await makeApiCall(
    "/auth/login",
    "POST",
    { username, password },
    false
  );

  if (loginResponseEl)
    loginResponseEl.textContent = JSON.stringify(result, null, 2);
  if (result && result.token) {
    jwtToken = result.token;
    localStorage.setItem("jwtToken", jwtToken);
    updateLoginStatus();
  } else {
    logoutUser();
  }
}

function loginAdmin() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  if (usernameInput) usernameInput.value = "admin";
  if (passwordInput) passwordInput.value = "123456789";
  loginUser(true);
}

function logoutUser() {
  jwtToken = null;
  localStorage.removeItem("jwtToken");
  const loginResponseEl = document.getElementById("loginResponse");
  if (loginResponseEl) loginResponseEl.textContent = "Logged out.";
  updateLoginStatus();
}

async function getMyUserData() {
  const result = await makeApiCall("/auth/me");
  const myUserDataResponseEl = document.getElementById("myUserDataResponse");
  if (myUserDataResponseEl)
    myUserDataResponseEl.textContent = JSON.stringify(result, null, 2);
}

async function getAllUsers() {
  const result = await makeApiCall("/users");
  const allUsersResponseEl = document.getElementById("allUsersResponse");
  if (allUsersResponseEl)
    allUsersResponseEl.textContent = JSON.stringify(result, null, 2);
}

async function getContracts() {
  const contractEmpresaInput = document.getElementById("contractEmpresa");
  const contractInicioInput = document.getElementById("contractInicio");
  const contractsResponseEl = document.getElementById("contractsResponse");

  const empresa = contractEmpresaInput ? contractEmpresaInput.value : "";
  const inicio = contractInicioInput ? contractInicioInput.value : "";

  const queryParams = {};
  if (empresa) queryParams.empresa = empresa;
  if (inicio) queryParams.inicio = inicio;

  const result = await makeApiCall("/contracts", "GET", queryParams, true);
  if (contractsResponseEl)
    contractsResponseEl.textContent = JSON.stringify(result, null, 2);
}

window.loginUser = loginUser;
window.loginAdmin = loginAdmin;
window.logoutUser = logoutUser;
window.getMyUserData = getMyUserData;
window.getAllUsers = getAllUsers;
window.getContracts = getContracts;
