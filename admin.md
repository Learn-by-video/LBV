python3 -m http.server 3000




<script>
    function checkCookie() {
        const cookies = document.cookie.split("; ");
        const accessCookie = cookies.find(row => row.startsWith("access="));

        if (!accessCookie || accessCookie.split("=")[1] !== "1") {
            window.location.href = "/index.html"; // Redirect if no valid cookie
        }
    }

    window.onload = function () {
        checkCookie(); // Verify cookie before loading the page
    };
</script>

<script>
    async function fetchVersion() {
        try {
            const response = await fetch("/version.txt?nocache=" + new Date().getTime());
            const versionText = await response.text();
            document.getElementById("siteVersion").textContent = versionText.trim();
        } catch (error) {
            document.getElementById("siteVersion").textContent = "Unavailable";
         }
    }

    window.onload = fetchVersion;
</script>