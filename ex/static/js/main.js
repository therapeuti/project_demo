// static/js/main.js
document.addEventListener("DOMContentLoaded", function () {
    fetchWeather();
});

function fetchWeather() {
    const apiKey = "여기에_날씨_API_키";
    const city = "Seoul";
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&lang=kr&units=metric`)
        .then(res => res.json())
        .then(data => {
            const weather = `${data.weather[0].description}, ${data.main.temp}°C`;
            document.getElementById("weather").textContent = weather;
        })
        .catch(() => {
            document.getElementById("weather").textContent = "날씨 정보를 불러올 수 없습니다.";
        });
}

function login() {
    alert("로그인 페이지로 이동");
}

function logout() {
    alert("로그아웃되었습니다.");
}

function showNotifications() {
    alert("알림창 표시");
}
