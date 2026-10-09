```javascript
// ===================================
// KONFIGURASI FIREBASE
// ===================================

// Nanti isi konfigurasi dari proyek Firebase milikmu.
// Sebelum dikonfigurasi, mode nyata akan menampilkan status
// bahwa koneksi Firebase belum siap.

const firebaseConfig = {
    apiKey: "ISI_API_KEY",
    authDomain: "ISI_AUTH_DOMAIN",
    databaseURL: "ISI_DATABASE_URL",
    projectId: "ISI_PROJECT_ID",
    appId: "ISI_APP_ID"
};

let database = null;
let firebaseSiap = false;
let hentikanListener = null;

// ===================================
// ELEMEN DASHBOARD
// ===================================

const modeSelect = document.getElementById("modeSelect");
const petunjukMode = document.getElementById("petunjukMode");
const statusSistem = document.getElementById("status");

const suhuElement = document.getElementById("suhu");
const kelembapanElement = document.getElementById("kelembapan");
const tanggalElement = document.getElementById("tanggal");
const waktuElement = document.getElementById("waktu");
const dataTerakhirElement = document.getElementById("dataTerakhir");

// ===================================
// RTC SIMULASI
// ===================================

function updateRTC() {
    const sekarang = new Date();

    tanggalElement.innerText =
        sekarang.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    waktuElement.innerText =
        sekarang.toLocaleTimeString("id-ID");
}

setInterval(updateRTC, 1000);
updateRTC();

// ===================================
// DATA SIMULASI
// ===================================

let suhu = 30.1;
let kelembapan = 74.3;

// ===================================
// GRAFIK
// ===================================

const labels = [];
const dataSuhu = [];
const dataKelembapan = [];

const chartSuhu = new Chart(
    document.getElementById("grafikSuhu").getContext("2d"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Suhu (°C)",
                data: dataSuhu,
                borderColor: "#0284c7",
                backgroundColor: "rgba(2, 132, 199, 0.12)",
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Suhu (°C)"
                    }
                }
            }
        }
    }
);

const chartKelembapan = new Chart(
    document.getElementById("grafikKelembapan").getContext("2d"),
    {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Kelembapan (%)",
                data: dataKelembapan,
                borderColor: "#16a34a",
                backgroundColor: "rgba(22, 163, 74, 0.12)",
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            animation: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Kelembapan (%)"
                    }
                }
            }
        }
    }
);

// ===================================
// MENAMBAHKAN DATA KE GRAFIK
// ===================================

function tambahDataGrafik(nilaiSuhu, nilaiKelembapan, waktu) {
    labels.push(waktu);
    dataSuhu.push(nilaiSuhu);
    dataKelembapan.push(nilaiKelembapan);

    // Simpan 20 titik data terakhir di grafik
    if (labels.length > 20) {
        labels.shift();
        dataSuhu.shift();
        dataKelembapan.shift();
    }

    chartSuhu.update();
    chartKelembapan.update();
}

// ===================================
// MODE SIMULASI
// ===================================

function updateSensorSimulasi() {
    if (modeSelect.value !== "simulasi") {
        return;
    }

    suhu += (Math.random() - 0.5) * 0.3;
    kelembapan += (Math.random() - 0.5) * 0.8;

    // Batasi nilai simulasi agar tetap masuk akal
    suhu = Math.max(15, Math.min(45, suhu));
    kelembapan = Math.max(20, Math.min(95, kelembapan));

    suhu = Number(suhu.toFixed(2));
    kelembapan = Number(kelembapan.toFixed(2));

    const sekarang = new Date();
    const waktu = sekarang.toLocaleTimeString("id-ID");

    suhuElement.innerText = suhu.toFixed(2);
    kelembapanElement.innerText = kelembapan.toFixed(2);

    tambahDataGrafik(suhu, kelembapan, waktu);

    dataTerakhirElement.innerText = waktu;
    statusSistem.innerText = "SIMULASI";
    petunjukMode.innerText =
        "Data simulasi aktif; bukan pembacaan sensor asli.";
}

setInterval(updateSensorSimulasi, 3000);
updateSensorSimulasi();

// ===================================
// MODE PERANGKAT NYATA
// ===================================

function kosongkanTampilanNyata() {
    suhuElement.innerText = "--";
    kelembapanElement.innerText = "--";
    dataTerakhirElement.innerText = "--";

    labels.length = 0;
    dataSuhu.length = 0;
    dataKelembapan.length = 0;

    chartSuhu.update();
    chartKelembapan.update();
}

function mulaiModeNyata() {
    kosongkanTampilanNyata();

    statusSistem.innerText = "BELUM TERHUBUNG";

    if (typeof firebase === "undefined") {
        petunjukMode.innerText =
            "Library Firebase belum berhasil dimuat.";
        return;
    }

    // Pastikan konfigurasi Firebase sudah diganti
    // dengan data proyek Firebase milikmu.
    const konfigurasiBelumDiisi =
        firebaseConfig.apiKey === "ISI_API_KEY" ||
        firebaseConfig.databaseURL === "ISI_DATABASE_URL" ||
        firebaseConfig.projectId === "ISI_PROJECT_ID" ||
        firebaseConfig.appId === "ISI_APP_ID";

    if (konfigurasiBelumDiisi) {
        petunjukMode.innerText =
            "Mode nyata siap disiapkan, tetapi Firebase belum dikonfigurasi. Data sensor belum diterima.";
        statusSistem.innerText = "MENUNGGU KONFIGURASI";
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        database = firebase.database();
        firebaseSiap = true;

        petunjukMode.innerText =
            "Menghubungkan ke Firebase dan menunggu data ESP32...";

        statusSistem.innerText = "MENUNGGU DATA";

        // Struktur data yang diharapkan:
        // /sensor/suhu
        // /sensor/kelembapan
        // /sensor/waktu

        const sensorRef = database.ref("sensor");

        const listener = sensorRef.on("value", function (snapshot) {
            if (modeSelect.value !== "nyata") {
                return;
            }

            const data = snapshot.val();

            if (!data ||
                typeof data.suhu !== "number" ||
                typeof data.kelembapan !== "number") {
                statusSistem.innerText = "DATA BELUM ADA";
                petunjukMode.innerText =
                    "Firebase terhubung, tetapi data suhu dan kelembapan belum tersedia.";
                return;
            }

            const nilaiSuhu = data.suhu;
            const nilaiKelembapan = data.kelembapan;

            suhuElement.innerText = nilaiSuhu.toFixed(2);
            kelembapanElement.innerText = nilaiKelembapan.toFixed(2);

            let waktu = new Date().toLocaleTimeString("id-ID");

            if (data.waktu) {
                waktu = String(data.waktu);
            }

            tambahDataGrafik(
                nilaiSuhu,
                nilaiKelembapan,
                waktu
            );

            dataTerakhirElement.innerText = waktu;
            statusSistem.innerText = "DATA DITERIMA";
            petunjukMode.innerText =
                "Data diterima dari Firebase. Pastikan ESP32 mengirim pembacaan sensor asli.";
        }, function (error) {
            statusSistem.innerText = "KONEKSI GAGAL";
            petunjukMode.innerText =
                "Firebase gagal diakses: " + error.message;
        });

        hentikanListener = function () {
            sensorRef.off("value", listener);
        };

    } catch (error) {
        statusSistem.innerText = "KONEKSI GAGAL";
        petunjukMode.innerText =
            "Gagal memulai Firebase: " + error.message;
    }
}

// ===================================
// PILIH MODE DASHBOARD
// ===================================

modeSelect.addEventListener("change", function () {
    if (hentikanListener) {
        hentikanListener();
        hentikanListener = null;
    }

    firebaseSiap = false;

    if (modeSelect.value === "simulasi") {
        statusSistem.innerText = "SIMULASI";
        petunjukMode.innerText =
            "Data simulasi sedang digunakan.";

        updateSensorSimulasi();
    } else {
        mulaiModeNyata();
    }
});
```