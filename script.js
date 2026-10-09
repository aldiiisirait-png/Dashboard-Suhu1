
"use strict";

// =====================================
// MODE DASHBOARD
// =====================================

const modeSelect = document.getElementById("modeSelect");
const petunjukMode = document.getElementById("petunjukMode");
const statusElement = document.getElementById("status");

const suhuElement = document.getElementById("suhu");
const kelembapanElement = document.getElementById("kelembapan");
const tanggalElement = document.getElementById("tanggal");
const waktuElement = document.getElementById("waktu");
const dataTerakhirElement = document.getElementById("dataTerakhir");

let mode = "simulasi";

// =====================================
// RTC SIMULASI
// Menggunakan waktu komputer untuk sementara
// =====================================

function updateRTC() {
    const sekarang = new Date();

    tanggalElement.textContent =
        sekarang.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    waktuElement.textContent =
        sekarang.toLocaleTimeString("id-ID");
}

updateRTC();
setInterval(updateRTC, 1000);

// =====================================
// DATA SIMULASI
// =====================================

let suhu = 30.10;
let kelembapan = 74.30;

// =====================================
// GRAFIK
// =====================================

const labels = [];
const dataSuhu = [];
const dataKelembapan = [];

const chartSuhu = new Chart(
    document.getElementById("grafikSuhu"),
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
            animation: false
        }
    }
);

const chartKelembapan = new Chart(
    document.getElementById("grafikKelembapan"),
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
                    max: 100
                }
            }
        }
    }
);

// =====================================
// UPDATE GRAFIK
// =====================================

function tambahDataGrafik(nilaiSuhu, nilaiKelembapan, waktu) {
    labels.push(waktu);
    dataSuhu.push(nilaiSuhu);
    dataKelembapan.push(nilaiKelembapan);

    // Simpan maksimal 20 data
    if (labels.length > 20) {
        labels.shift();
        dataSuhu.shift();
        dataKelembapan.shift();
    }

    chartSuhu.update();
    chartKelembapan.update();
}

// =====================================
// MODE SIMULASI
// =====================================

function updateSensorSimulasi() {
    if (mode !== "simulasi") return;

    // Perubahan angka simulasi
    suhu += (Math.random() - 0.5) * 0.3;
    kelembapan += (Math.random() - 0.5) * 0.8;

    // Batas nilai agar tetap masuk akal
    suhu = Math.max(15, Math.min(45, suhu));
    kelembapan = Math.max(20, Math.min(95, kelembapan));

    suhu = Number(suhu.toFixed(2));
    kelembapan = Number(kelembapan.toFixed(2));

    const sekarang = new Date();
    const waktu = sekarang.toLocaleTimeString("id-ID");

    suhuElement.textContent = suhu.toFixed(2);
    kelembapanElement.textContent = kelembapan.toFixed(2);

    tambahDataGrafik(suhu, kelembapan, waktu);

    dataTerakhirElement.textContent = waktu;
    statusElement.textContent = "SIMULASI";
    petunjukMode.textContent =
        "Data simulasi aktif, bukan data sensor asli.";
}

// Jalankan simulasi setiap 3 detik
setInterval(updateSensorSimulasi, 3000);

// Tampilkan data langsung saat halaman dibuka
updateSensorSimulasi();

// =====================================
// FIREBASE
// Isi konfigurasi ini nanti dari Firebase
// =====================================

const firebaseConfig = {
    apiKey: "ISI_API_KEY",
    authDomain: "ISI_AUTH_DOMAIN",
    databaseURL: "ISI_DATABASE_URL",
    projectId: "ISI_PROJECT_ID",
    appId: "ISI_APP_ID"
};

let sensorRef = null;
let sensorListener = null;

// =====================================
// MODE PERANGKAT NYATA
// =====================================

function kosongkanDataNyata() {
    suhuElement.textContent = "--";
    kelembapanElement.textContent = "--";
    dataTerakhirElement.textContent = "--";

    labels.length = 0;
    dataSuhu.length = 0;
    dataKelembapan.length = 0;

    chartSuhu.update();
    chartKelembapan.update();
}

function hentikanFirebase() {
    if (sensorRef && sensorListener) {
        sensorRef.off("value", sensorListener);
    }

    sensorRef = null;
    sensorListener = null;
}

function mulaiModeNyata() {
    hentikanFirebase();
    kosongkanDataNyata();

    statusElement.textContent = "BELUM TERHUBUNG";

    if (typeof firebase === "undefined") {
        petunjukMode.textContent =
            "Library Firebase belum berhasil dimuat.";
        return;
    }

    const belumDiisi =
        firebaseConfig.apiKey === "ISI_API_KEY" ||
        firebaseConfig.databaseURL === "ISI_DATABASE_URL" ||
        firebaseConfig.projectId === "ISI_PROJECT_ID" ||
        firebaseConfig.appId === "ISI_APP_ID";

    if (belumDiisi) {
        statusElement.textContent = "MENUNGGU KONFIGURASI";
        petunjukMode.textContent =
            "Firebase belum dikonfigurasi. Data ESP32 belum diterima.";
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const database = firebase.database();

        sensorRef = database.ref("sensor");

        sensorListener = function(snapshot) {
            // Abaikan data jika pengguna sudah kembali ke simulasi
            if (mode !== "nyata") return;

            const data = snapshot.val();

            if (
                !data ||
                typeof data.suhu !== "number" ||
                typeof data.kelembapan !== "number"
            ) {
                statusElement.textContent = "DATA BELUM ADA";
                petunjukMode.textContent =
                    "Belum ada data suhu dan kelembapan di Firebase.";
                return;
            }

            const nilaiSuhu = data.suhu;
            const nilaiKelembapan = data.kelembapan;

            suhuElement.textContent = nilaiSuhu.toFixed(2);
            kelembapanElement.textContent =
                nilaiKelembapan.toFixed(2);

            const waktu = data.waktu
                ? String(data.waktu)
                : new Date().toLocaleTimeString("id-ID");

            tambahDataGrafik(
                nilaiSuhu,
                nilaiKelembapan,
                waktu
            );

            dataTerakhirElement.textContent = waktu;
            statusElement.textContent = "DATA DITERIMA";
            petunjukMode.textContent =
                "Data diterima dari Firebase.";
        };

        sensorRef.on(
            "value",
            sensorListener,
            function(error) {
                statusElement.textContent = "KONEKSI GAGAL";
                petunjukMode.textContent =
                    "Firebase gagal diakses: " + error.message;
            }
        );

        statusElement.textContent = "MENGHUBUNGKAN";
        petunjukMode.textContent =
            "Menghubungkan ke Firebase dan menunggu data ESP32.";

    } catch (error) {
        statusElement.textContent = "KONEKSI GAGAL";
        petunjukMode.textContent =
            "Gagal memulai Firebase: " + error.message;
    }
}

// =====================================
// PILIH MODE
// =====================================

modeSelect.addEventListener("change", function() {
    mode = modeSelect.value;

    if (mode === "simulasi") {
        hentikanFirebase();

        statusElement.textContent = "SIMULASI";
        petunjukMode.textContent =
            "Data simulasi aktif, bukan data sensor asli.";

        updateSensorSimulasi();
    } else {
        mulaiModeNyata();
    }
});
