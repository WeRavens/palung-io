// Tambahan Kategori Seru & Inklusif untuk Semua Kalangan (Anak, Remaja, Keluarga)

const EXTRA_CATEGORIES = [
  {
    id: "rempah-bumbu-dapur",
    title: "Sebutkan Rempah-Rempah atau Bumbu Dapur",
    theme: "nusantara",
    hint: "Dari bumbu dasar di dapur Ibu hingga rempah legendaris Nusantara yang dicari bangsa Eropa!",
    educationalNote: "Kepulauan Maluku pernah dijuluki 'The Spice Islands' karena menjadi satu-satunya tempat asal pohon Cengkeh dan Pala di dunia pada masa lalu.",
    answers: [
      // PLANKTON
      { name: "Garam", aliases: ["salt"], score: 12, fact: "Pada zaman Romawi Kuno, prajurit kadang dibayar menggunakan garam (Salarium), yang menjadi asal kata 'Salary' (Gaji)!" },
      { name: "Bawang Merah", aliases: ["shallot"], score: 13, fact: "Gas syn-propanethial-S-oxide yang keluar saat bawang diiris adalah mekanisme pertahanan alami tanaman bawang agar tidak dimakan hewan." },
      { name: "Bawang Putih", aliases: ["garlic"], score: 14, fact: "Mengandung senyawa Allicin yang bersifat antibakteri alami dan telah digunakan sejak pembangunan Piramida Mesir." },
      { name: "Cabai", aliases: ["cabe", "cabai rawit", "cabai merah", "lombok"], score: 15, fact: "Burung tidak merasakan pedas sama sekali saat memakan cabai karena reseptor saraf burung tidak bereaksi terhadap zat Capsaicin!" },
      { name: "Jahe", aliases: ["ginger", "jahe merah"], score: 18, fact: "Mengandung Gingerol yang efektif meredakan mual dan menghangatkan tubuh." },
      { name: "Kunyit", aliases: ["kunir", "turmeric"], score: 19, fact: "Mengandung Kurkumin yang selain memberi warna kuning alami juga merupakan antioksidan dan anti-inflamasi kuat." },
      { name: "Merica", aliases: ["lada", "lada hitam", "lada putih", "pepper"], score: 20, fact: "Pada Abad Pertengahan di Eropa, merica begitu berharga hingga dijuluki 'Emas Hitam' dan bisa digunakan untuk membayar sewa tanah serta pajak!" },
      { name: "Gula", aliases: ["gula pasir", "gula merah", "gula aren", "gula jawa"], score: 16, fact: "Gula Aren dibuat dari sadapan nira bunga pohon enau (aren) dan memiliki indeks glikemik lebih rendah dari gula pasir." },
      { name: "Ketumbar", aliases: ["coriander"], score: 25, fact: "Daunnya disebut Daun Ketumbar (Cilantro) dan bijinya yang wangi mengharumkan tempe goreng hingga rendang." },
      { name: "Kemiri", aliases: ["candlenut"], score: 27, fact: "Dalam bahasa Inggris disebut 'Candlenut' (Kacang Lilin) karena kandungan minyaknya begitu tinggi hingga bijinya bisa dinyalakan seperti lilin!" },

      // KARANG
      { name: "Serai", aliases: ["sereh", "lemongrass"], score: 36, fact: "Aroma segarnya berasal dari senyawa Citral yang disukai manusia tetapi sangat dibenci oleh nyamuk." },
      { name: "Lengkuas", aliases: ["laos", "galangal"], score: 38, fact: "Rimpang wajib dalam masakan rendang, soto, dan sayur asem yang memberikan aroma hangat khas Nusantara." },
      { name: "Kencur", aliases: ["cikur"], score: 40, fact: "Bumbu utama jamu Beras Kencur serta kuliner Seblak dan Urap yang memiliki efek melegakan tenggorokan." },
      { name: "Daun Salam", aliases: ["bay leaf"], score: 42, fact: "Daun aromatik utama masakan Indonesia yang berasal dari pohon Syzygium polyanthum (masih satu keluarga dengan jambu!)." },
      { name: "Daun Jeruk", aliases: ["jeruk purut"], score: 44, fact: "Daun Jeruk Purut memiliki bentuk unik menyerupai angka 8 (dua helai daun yang menyambung)." },
      { name: "Kayu Manis", aliases: ["cinnamon"], score: 45, fact: "Bukanlah batang kayu biasa, melainkan lapisan kulit bagian dalam pohon Cinnamomum yang menggulung sendiri saat dikeringkan di bawah matahari!" },
      { name: "Cengkeh", aliases: ["cengkih", "clove"], score: 48, fact: "Sebenarnya adalah kuncup bunga pohon cengkeh yang dipetik dan dikeringkan sebelum sempat mekar; berasal asli dari Maluku Utara!" },
      { name: "Pala", aliases: ["biji pala", "nutmeg", "fuli"], score: 50, fact: "Pada tahun 1667, Belanda rela menukar Pulau Manhattan (kini kota New York!) kepada Inggris demi mendapatkan Pulau Run di Banda yang kaya pohon Pala!" },
      { name: "Asam Jawa", aliases: ["asem jawa", "tamarind"], score: 52, fact: "Selain menyegarkan kuah sayur asem, asam jawa bisa membersihkan noda kusam pada logam tembaga dan kuningan." },
      { name: "Bawang Bombay", aliases: ["bombay"], score: 46, fact: "Dinamai Bawang Bombay di Indonesia karena dulu dibawa oleh pedagang yang berlayar dari pelabuhan Bombay (kini Mumbai), India." },
      { name: "Terasi", aliases: ["belacan"], score: 54, fact: "Bumbu fermentasi udang rebon atau ikan kecil yang kaya asam glutamat alami (sumber rasa Umami Nusantara)." },
      { name: "Santan", aliases: ["kelapa"], score: 49, fact: "Emulsi alami minyak dan air dari daging kelapa tua yang membuat bumbu rempah larut sempurna." },
      { name: "Wijen", aliases: ["biji wijen", "sesame"], score: 58, fact: "Ungkapan dongeng 'Open Sesame!' (Terbukalah Wijen!) berasal dari sifat polong biji wijen yang tiba-tiba meletup terbuka saat sudah matang!" },

      // ABISAL
      { name: "Kapulaga", aliases: ["cardamom"], score: 68, fact: "Dijuluki 'Ratu Rempah-Rempah' (sementara lada hitam adalah Rajanya) dan merupakan salah satu rempah termahal ketiga di dunia." },
      { name: "Jintan", aliases: ["jinten", "cumin", "jintan hitam", "habbatussauda"], score: 72, fact: "Biji rempah aromatik yang menjadi kunci cita rasa gulai, opor, dan kari sejak zaman Mesir Kuno." },
      { name: "Bunga Lawang", aliases: ["pekak", "star anise"], score: 76, fact: "Rempah berbentuk bintang bersudut delapan yang mengandung asam shikimat, bahan dasar pembuatan obat antivirus flu dunia!" },
      { name: "Kluwek", aliases: ["keluak", "kepayang", "kluwak"], score: 78, fact: "Biji segar pohon Kepayang sebenarnya mengandung asam sianida beracun, namun setelah direbus dan dipendam dalam abu selama 40 hari berubah menjadi bumbu Rawon yang lezat dan aman!" },
      { name: "Temulawak", aliases: ["temu kunci", "temu ireng", "temu mangga"], score: 74, fact: "Tanaman obat asli Indonesia (Curcuma zanthorrhiza) yang menjadi maskot jamu Nusantara untuk menjaga fungsi hati." },
      { name: "Daun Pandan", aliases: ["pandan", "suji"], score: 66, fact: "Dijuluki sebagai 'Vanili dari Asia Tenggara'; molekul aromanya (2-acetyl-1-pyrroline) sama persis dengan molekul yang membuat beras Pandan Wangi dan Basmati beraroma harum!" },
      { name: "Vanili", aliases: ["vanilla"], score: 75, fact: "Buah polong dari tanaman Anggrek merambat! Karena penyerbukan bunganya harus dilakukan satu per satu dengan tangan manusia, vanili menjadi rempah termahal kedua di dunia." },
      { name: "Andaliman", aliases: ["merica batak"], score: 86, fact: "Rempah endemik Sumatera Utara yang memberikan sensasi getar 'menggigit' yang unik di lidah (mengandung hydroxy-alpha-sanshool) pada masakan Arsik!" },
      { name: "Kecombrang", aliases: ["honje", "kantan", "bunga kecombrang"], score: 84, fact: "Bunga kuncup berwarna merah muda cerah dari keluarga jahe-jahean yang memberikan aroma segar luar biasa pada sambal dan pecel." },

      // LEGENDA PALUNG
      { name: "Saffron", aliases: ["kuma-kuma", "zafran"], score: 92, fact: "Rempah termahal di dunia (harganya bisa melebihi emas per gramnya!) karena dibutuhkan 150.000 bunga Crocus sativus yang dipetik tangan untuk menghasilkan 1 kg Saffron!" },
      { name: "Asam Kandis", aliases: ["asam gelugur", "asam sunti"], score: 94, fact: "Asam Sunti adalah bumbu khas Aceh yang dibuat dari belimbing wuluh yang dijemur dan digarami berulang-ulang hingga berwarna cokelat dan tahan berbulan-bulan." },
      { name: "Kemenyan", aliases: ["adas", "adas manis", "klabet", "fenugreek"], score: 95, fact: "Biji Klabet (Fenugreek) dan Adas Manis adalah rahasia di balik aroma khas kari dan roti tradisional Timur Tengah hingga Nusantara." },
      { name: "Cabe Jawa", aliases: ["cabai jawa", "lada panjang", "kemukus", "kayu secang", "secang"], score: 97, fact: "Sebelum cabai dari benua Amerika masuk ke Nusantara pada abad ke-16, masyarakat Jawa dan Sumatera zaman Majapahit menggunakan Cabe Jawa (Piper retrofractum) dan Merica untuk rasa pedas!" },
      { name: "Kulit Lawang", aliases: ["mesoyi", "masoyi", "daun gedi", "kluwih"], score: 99, fact: "Kayu Mesoyi dan Kulit Lawang adalah rempah hutan endemik Maluku dan Papua yang aromanya harum manis seperti perpaduan kayu manis, kelapa, dan cengkeh!" }
    ]
  },

  {
    id: "profesi-pekerjaan",
    title: "Sebutkan Nama Profesi atau Pekerjaan",
    theme: "umum",
    hint: "Dari profesi sehari-hari di sekitar kita hingga profesi sains, seni, dan spesialis langka!",
    educationalNote: "Perkembangan teknologi terus melahirkan profesi-profesi baru yang 20 tahun lalu bahkan belum pernah terdengar namanya.",
    answers: [
      // PLANKTON
      { name: "Dokter", aliases: ["dokter umum", "dokter gigi", "doctor"], score: 12, fact: "Simbol tongkat dengan satu ular yang melilit pada lambang medis adalah Tongkat Asclepius dari mitologi Yunani Kuno." },
      { name: "Guru", aliases: ["pengajar", "dosen", "teacher"], score: 13, fact: "Kata 'Guru' dalam bahasa Sanskerta secara filosofis berarti 'pengusir kegelapan' (Gu = kegelapan, Ru = penghapus/penerang)." },
      { name: "Polisi", aliases: ["polri"], score: 15, fact: "Detektif dan kepolisian modern pertama yang menggunakan ilmu forensik sidik jari dimulai pada akhir abad ke-19." },
      { name: "Pilot", aliases: ["penerbang"], score: 16, fact: "Dalam penerbangan komersial jarak jauh, pilot dan kopilot wajib memakan menu makanan yang berbeda agar jika satu makanan bermasalah, pilot lainnya tetap sehat!" },
      { name: "Programmer", aliases: ["developer", "software engineer", "coder", "it"], score: 18, fact: "Istilah 'Bug' (kutu) untuk error komputer berasal dari seekor ngengat asli yang terjebak di dalam relai komputer Harvard Mark II pada tahun 1947!" },
      { name: "Petani", aliases: ["pekebun"], score: 19, fact: "Profesi yang menjadi fondasi munculnya peradaban kota manusia sejak Revolusi Pertanian 10.000 tahun yang lalu." },
      { name: "Nelayan", aliases: [], score: 20, fact: "Nelayan tradisional Nusantara sejak zaman dahulu menggunakan rasi bintang Pari (Crux) dan Waluku (Orion) sebagai kompas langit di tengah laut." },
      { name: "Koki", aliases: ["chef", "juru masak"], score: 22, fact: "Secara tradisional, jumlah lipatan pada topi tinggi seorang Chef (Toque) melambangkan 100 cara berbeda seorang chef dapat memasak telur!" },
      { name: "Tentara", aliases: ["tni", "prajurit", "militer"], score: 22, fact: "Pasukan penjaga perdamaian Garuda Indonesia (Kontingen Garuda) telah bertugas di berbagai misi PBB sejak tahun 1957." },
      { name: "Perawat", aliases: ["suster", "bidan", "nurse"], score: 24, fact: "Florence Nightingale, pelopor keperawatan modern, sebenarnya juga seorang ahli statistik jenius yang menemukan diagram grafik lingkaran bertumpuk (Coxcomb Chart)!" },
      { name: "Supir", aliases: ["sopir", "driver", "masinis", "nahkoda"], score: 25, fact: "Masinis kereta cepat harus menjalani pelatihan simulasi ribuan jam untuk mengendalikan kereta pada kecepatan di atas 300 km/jam." },
      { name: "Pedagang", aliases: ["pengusaha", "wirausaha", "penjual"], score: 26, fact: "Jalur perdagangan rempah dan sutra kuno adalah jaringan global pertama yang menghubungkan budaya Timur dan Barat." },

      // KARANG
      { name: "Arsitek", aliases: ["architect"], score: 36, fact: "Pada tahun 1912 hingga 1948, Arsitektur pernah menjadi salah satu cabang resmi yang memperebutkan medali emas di ajang Olimpiade!" },
      { name: "Pengacara", aliases: ["advokat", "hakim", "jaksa", "notaris"], score: 38, fact: "Palu hakim digunakan di ruang sidang sebagai simbol wewenang dan penanda dimulainya serta ditutupnya ketetapan hukum." },
      { name: "Pemadam Kebakaran", aliases: ["damkar", "firefighter"], score: 40, fact: "Selain memadamkan api, petugas Damkar di Indonesia terkenal serbabisa: mulai dari mengevakuasi sarang tawon, melepas cincin macet, hingga menyelamatkan kucing!" },
      { name: "Astronot", aliases: ["antariksawan", "kosmonot"], score: 42, fact: "Saat berada di luar angkasa tanpa gravitasi, tinggi badan seorang astronot dapat bertambah sekitar 3 hingga 5 sentimeter karena tulang belakangnya meregang!" },
      { name: "Akuntan", aliases: ["auditor", "bankir"], score: 45, fact: "Sistem pembukuan berpasangan (Debit & Kredit) modern pertama kali ditulis oleh matematikawan Luca Pacioli (sahabat Leonardo da Vinci) pada tahun 1494!" },
      { name: "Wartawan", aliases: ["jurnalis", "reporter"], score: 46, fact: "Surat kabar cetak harian pertama di dunia terbit di Jerman pada tahun 1605." },
      { name: "Apoteker", aliases: ["farmasis"], score: 48, fact: "Simbol mangkuk dengan ular pada apotek adalah Mangkuk Hygieia, dewi kesehatan dan kebersihan Yunani (asal kata 'Hygiene')." },
      { name: "Psikolog", aliases: ["psikiater", "konselor"], score: 50, fact: "Membantu kesehatan mental, pemetaan bakat, serta terapi perilaku manusia di era modern." },
      { name: "Pramugari", aliases: ["pramugara", "awak kabin"], score: 49, fact: "Profesi pramugari pertama di dunia pada tahun 1930 mewajibkan seluruh anggotanya berlatar belakang perawat medis resmi!" },
      { name: "Fotografer", aliases: ["videografer", "kameramen", "sutradara"], score: 47, fact: "Foto pertama yang menampilkan sosok manusia diambil oleh Louis Daguerre di Paris tahun 1838 karena orang tersebut berdiri diam selama 10 menit saat menyemir sepatu!" },
      { name: "Desainer", aliases: ["desainer grafis", "ilustrator", "animator", "komikus"], score: 44, fact: "Untuk membuat satu film animasi layar lebar, ratusan animator harus menggambar atau merender lebih dari 120.000 frame gambar!" },
      { name: "Insinyur", aliases: ["engineer", "teknisi", "mekanik", "montir"], score: 43, fact: "Kata 'Engineer' berasal dari kata Latin 'Ingenium' yang berarti kecerdikan atau penemuan pintar." },
      { name: "Peneliti", aliases: ["ilmuwan", "scientist"], score: 54, fact: "Istilah 'Scientist' (Ilmuwan) baru diciptakan pada tahun 1834 oleh William Whewell untuk menghormati ilmuwan perempuan Mary Somerville!" },

      // ABISAL
      { name: "Arkeolog", aliases: ["paleontolog", "sejarawan"], score: 68, fact: "Arkeolog meneliti peninggalan kebudayaan manusia masa lalu, sedangkan Paleontolog meneliti fosil makhluk hidup purba seperti dinosaurus." },
      { name: "Geolog", aliases: ["ahli geologi", "vulkanolog", "seismolog"], score: 72, fact: "Vulkanolog di Indonesia bertugas memantau 127 gunung berapi aktif dari pos pengamatan gunung api di seluruh Nusantara." },
      { name: "Astronom", aliases: ["astrofisikawan"], score: 74, fact: "Observatorium Bosscha di Lembang, Bandung (berdiri tahun 1923) adalah salah satu pusat pengamatan astronomi tertua di belahan Bumi selatan!" },
      { name: "Pustakawan", aliases: ["kurator", "arsiparis"], score: 76, fact: "Perpustakaan tertua di dunia yang masih beroperasi tanpa henti sejak tahun 859 Masehi adalah Perpustakaan Al-Qarawiyyin di Maroko (didirikan oleh Fatima al-Fihri)." },
      { name: "Dalang", aliases: [], score: 78, fact: "Seorang Dalang wayang kulit adalah seniman multitalenta: ia harus menghafal puluhan suara tokoh berbeda, memimpin gamelan, bernyanyi, dan menggerakkan wayang semalam suntuk!" },
      { name: "Aktuaris", aliases: ["aktuaria"], score: 82, fact: "Ahli matematika dan statistik risiko masa depan yang menghitung probabilitas di balik asuransi, dana pensiun, dan ekonomi nasional." },
      { name: "Oseanografer", aliases: ["ahli kelautan", "biolog laut"], score: 84, fact: "Menjelajahi arus samudra, palung laut dalam, dan ekosistem terumbu karang menggunakan kapal riset serta robot ROV bawah laut." },
      { name: "Kriptografer", aliases: ["ahli keamanan siber", "ethical hacker"], score: 85, fact: "Merancang algoritma penyandian matematika agar pesan rahasia, kata sandi, dan transaksi perbankan digital tidak bisa dibobol." },
      { name: "Penerjemah", aliases: ["interpreter", "juru bahasa", "linguist"], score: 75, fact: "Juru Bahasa Simultan di sidang PBB harus mendengarkan kalimat dalam satu bahasa sambil berbicara menerjemahkannya ke bahasa lain pada detik yang bersamaan!" },

      // LEGENDA PALUNG
      { name: "Kartografer", aliases: ["pembuat peta"], score: 91, fact: "Ahli pembuat peta bumi; dahulu kartografer sering menyelipkan satu jalan fiktif kecil ('Paper Town') di peta buatan mereka untuk menangkap pembajak peta!" },
      { name: "Kriminolog", aliases: ["ahli forensik", "patolog"], score: 92, fact: "Menggunakan analisis DNA, toksikologi, dan psikologi sosial untuk memecahkan misteri kejahatan dan mencegah kriminalitas." },
      { name: "Sommelier", aliases: ["barista", "q grader", "pencicip kopi"], score: 94, fact: "Seorang Q Grader (pencicip kopi bersertifikat internasional) harus lulus 20 ujian sensorik ketat untuk membedakan puluhan aroma dan tingkat keasaman biji kopi dunia!" },
      { name: "Entomolog", aliases: ["ornitolog", "botanis", "mikolog", "taksonom"], score: 96, fact: "Entomolog adalah ilmuwan peneliti serangga; jumlah spesies kumbang saja mencakup hampir 25% dari seluruh spesies makhluk hidup yang diketahui di Bumi!" },
      { name: "Luthier", aliases: ["pembuat biola", "pembuat gitar", "horolog", "pembuat jam"], score: 98, fact: "Luthier adalah pengrajin ahli pembuat dan perestorasi instrumen musik berdawai seperti biola, cello, gitar, dan kecapi." }
    ]
  },

  {
    id: "warisan-budaya-indonesia",
    title: "Sebutkan Tarian, Rumah Adat, atau Warisan Budaya Indonesia",
    theme: "nusantara",
    hint: "Nama tarian daerah, rumah adat, pakaian/kain tradisional, senjata, atau kesenian asli Nusantara!",
    educationalNote: "Indonesia memiliki lebih dari 1.300 suku bangsa dan lebih dari 700 bahasa daerah, menjadikannya salah satu negara paling beragam di dunia.",
    answers: [
      // PLANKTON
      { name: "Batik", aliases: ["kain batik"], score: 12, fact: "Diakui UNESCO pada 2 Oktober 2009; kata 'Batik' berasal dari bahasa Jawa 'Amba' (menulis) dan 'Titik'." },
      { name: "Wayang", aliases: ["wayang kulit", "wayang golek", "wayang orang"], score: 14, fact: "Ditetapkan UNESCO sebagai Masterpiece of the Oral and Intangible Heritage of Humanity sejak tahun 2003." },
      { name: "Tari Kecak", aliases: ["kecak"], score: 16, fact: "Tarian ikonik Bali yang tidak menggunakan alat musik sama sekali, melainkan irama vokal 'Cak-cak-cak' dari puluhan penari pria yang duduk melingkar!" },
      { name: "Tari Saman", aliases: ["saman"], score: 17, fact: "Tarian Seribu Tangan dari Suku Gayo, Aceh yang menuntut kekompakan luar biasa tanpa iringan alat musik selain tepukan tangan dan dada." },
      { name: "Tari Piring", aliases: [], score: 19, fact: "Tarian khas Minangkabau di mana penari mengayunkan piring dengan cepat tanpa terjatuh dan diakhiri dengan menari di atas pecahan piring!" },
      { name: "Tari Jaipong", aliases: ["jaipong", "jaipongan"], score: 20, fact: "Seni tari pergaulan dinamis khas Jawa Barat yang diciptakan oleh seniman Gugum Gumbira pada akhir tahun 1970-an." },
      { name: "Rumah Gadang", aliases: [], score: 22, fact: "Rumah adat Sumatera Barat dengan atap melengkung menyerupai tanduk kerbau (Gonjong) dan konstruksi kayu tahan gempa tanpa paku besi!" },
      { name: "Rumah Joglo", aliases: ["joglo"], score: 23, fact: "Rumah adat Jawa yang ditopang oleh empat tiang utama di tengah yang disebut Saka Guru." },
      { name: "Reog Ponorogo", aliases: ["reog", "barongan", "kuda lumping", "jatilan"], score: 25, fact: "Topeng Dadak Merak pada Reog Ponorogo memiliki berat mencapai 50 kg dan diangkat oleh penarinya hanya dengan kekuatan gigitan gigi!" },
      { name: "Keris", aliases: [], score: 26, fact: "Senjata pusaka Nusantara yang dibuat dengan teknik tempa lipat berlapis-lapis dari campuran besi, baja, dan batu meteorit (pamor)!" },

      // KARANG
      { name: "Rumah Honai", aliases: ["honai"], score: 38, fact: "Rumah adat Suku Dani di Pegunungan Papua yang berbentuk bundar beratap jerami tanpa jendela untuk menahan suhu dingin ekstrem di ketinggian." },
      { name: "Rumah Tongkonan", aliases: ["tongkonan"], score: 40, fact: "Rumah adat suku Toraja di Sulawesi Selatan dengan atap melengkung tinggi menyerupai perahu leluhur." },
      { name: "Ondel-ondel", aliases: ["ondel ondel", "lenong", "palang pintu"], score: 39, fact: "Boneka raksasa khas Betawi setinggi 2,5 meter yang awalnya dibuat sebagai penolak bala dan penjaga kampung." },
      { name: "Tari Pendet", aliases: ["pendet", "tari legong", "tari barong"], score: 42, fact: "Tarian penyambutan khas Bali di mana penari menaburkan kelopak bunga dari mangkuk perak (bokor)." },
      { name: "Tari Tor-Tor", aliases: ["tor tor", "tortor"], score: 44, fact: "Tarian seremonial suku Batak di Sumatera Utara yang namanya berasal dari suara hentakan kaki para penari di atas lantai papan rumah adat." },
      { name: "Tari Merak", aliases: [], score: 45, fact: "Tarian kreasi asal Pasundan yang menampilkan keindahan bulu ekor burung merak jantan yang sedang mengembang." },
      { name: "Tari Gambyong", aliases: ["gambyong", "tari serimpi", "tari bedhaya"], score: 48, fact: "Tarian klasik Jawa Tengah yang lemah gemulai untuk menyambut tamu kehormatan." },
      { name: "Kain Tenun", aliases: ["tenun ikat", "songket", "ulos"], score: 46, fact: "Kain Ulos Batak dan Songket Palembang dibuat helai demi helai menggunakan alat tenun tradisional selama berminggu-minggu hingga berbulan-bulan." },
      { name: "Kebaya", aliases: [], score: 43, fact: "Busana tradisional perempuan yang anggun dan resmi terdaftar sebagai Warisan Budaya Takbenda UNESCO pada tahun 2024." },
      { name: "Mandau", aliases: ["celurit", "rencong", "badik", "kujang"], score: 50, fact: "Kujang adalah pusaka khas Pasundan Jawa Barat yang bentuknya unik dan telah dibuat sejak abad ke-8 Masehi." },
      { name: "Lompat Batu", aliases: ["fahombo", "hombo batu"], score: 54, fact: "Tradisi pemuda Desa Bawomataluo di Pulau Nias yang melompati tumpukan batu setinggi lebih dari 2 meter tanpa alat bantu!" },
      { name: "Karapan Sapi", aliases: [], score: 56, fact: "Perlombaan pacuan sapi khas Pulau Madura yang diiringi musik gamelan Saronen yang meriah." },

      // ABISAL
      { name: "Subak", aliases: [], score: 70, fact: "Sistem irigasi sawah tradisional Bali yang berlandaskan filosofi Tri Hita Karana (harmoni manusia, alam, dan Tuhan) serta telah diakui sebagai Warisan Dunia UNESCO!" },
      { name: "Pinisi", aliases: ["kapal pinisi", "phinisi"], score: 72, fact: "Seni pembuatan kapal layar kayu legendaris suku Bugis-Makassar di Bulukumba yang dibangun tanpa cetak biru kertas namun mampu mengarungi samudra dunia!" },
      { name: "Noken", aliases: [], score: 75, fact: "Tas rajut tradisional masyarakat Papua yang dibuat dari serat kulit kayu dan dikenakan dengan disangkutkan di kepala; diakui UNESCO sejak 2012!" },
      { name: "Sisingaan", aliases: ["kuda renggong", "sintren", "ludruk", "ketoprak"], score: 74, fact: "Kesenian arak-arakan khas Subang, Jawa Barat di mana anak-anak duduk di atas patung singa yang diusung empat penari sambil beratraksi." },
      { name: "Tari Cakalele", aliases: ["cakalele", "tari sajojo", "tari yospan"], score: 77, fact: "Tarian perang tradisional yang gagah dari Maluku dan Sulawesi Utara dengan perlengkapan parang dan perisai kayu sempit bernama Salawaku." },
      { name: "Tari Lilin", aliases: ["tari payung", "tari indang", "randai"], score: 73, fact: "Randai adalah teater rakyat khas Minangkabau yang memadukan seni drama, musik, nyanyian, tarian, dan gerakan silat dalam formasi lingkaran." },
      { name: "Tari Topeng", aliases: ["tari topeng cirebon", "barongsai"], score: 76, fact: "Dalam Tari Topeng Cirebon, penari mengganti lima topeng berbeda secara berurutan yang melambangkan fase kehidupan manusia dari lahir hingga dewasa." },
      { name: "Rumah Limas", aliases: ["rumah panggung", "rumah bolon", "rumah betang", "rumah lamin"], score: 80, fact: "Rumah Betang dan Rumah Lamin di Kalimantan dapat memiliki panjang lebih dari 100 meter dan dihuni oleh puluhan keluarga besar sekaligus dalam satu atap!" },
      { name: "Sekaten", aliases: ["grebeg maulud", "kasada", "ngaben", "tabuik"], score: 84, fact: "Tabuik adalah festival budaya tahunan di pesisir Pariaman, Sumatera Barat yang telah berlangsung sejak abad ke-19." },

      // LEGENDA PALUNG
      { name: "Wayang Beber", aliases: ["wayang krucil", "wayang klithik", "wayang suket"], score: 92, fact: "Wayang Beber adalah salah satu bentuk wayang tertua di Indonesia (zaman Majapahit) di mana cerita dilukis pada gulungan kertas kayu (daluwang) yang dibentangkan oleh dalang!" },
      { name: "Makyong", aliases: ["mendu", "mamanda", "dulmuluk"], score: 95, fact: "Seni teater tari tradisional Melayu di Kepulauan Riau yang memadukan drama, tarian, musik, dan komedi serta telah diakui oleh UNESCO." },
      { name: "Bambu Gila", aliases: ["bulu gila", "debus", "bambangan cakil"], score: 93, fact: "Permainan rakyat mistis dan atraktif dari Maluku di mana sebatang bambu panjang menjadi terasa sangat berat dan bergerak liar saat dipeluk oleh tujuh pemuda!" },
      { name: "Rumah Woloan", aliases: ["rumah baileo", "rumah kaki seribu", "rumah sao ata mosa lakitana"], score: 97, fact: "Rumah Kaki Seribu (Mod Aki Aksa) adalah rumah adat Suku Arfak di Papua Barat yang ditopang oleh ratusan tiang kayu rapat di bagian kolongnya untuk melindungi penghuni dari binatang buas." },
      { name: "Kain Gringsing", aliases: ["tenun gringsing", "kain sasirangan", "kain tapis", "kain ulap doyo"], score: 98, fact: "Tenun Gringsing dari Desa Tenganan Pegringsingan, Bali adalah satu-satunya kain di Indonesia yang menggunakan teknik 'Double Ikat' (benang pakan dan lungsi diikat sekaligus) yang butuh waktu hingga 5 tahun untuk selesai!" }
    ]
  },

  {
    id: "sungai-danau-dunia",
    title: "Sebutkan Nama Sungai atau Danau di Indonesia & Dunia",
    theme: "geografi",
    hint: "Dari sungai terpanjang di dunia hingga sungai-sungai besar dan danau vulkanik di Indonesia!",
    educationalNote: "Sungai dan danau menyimpan air tawar permukaan yang menjadi urat nadi kehidupan, pertanian, dan transportasi sejak peradaban kuno.",
    answers: [
      // PLANKTON
      { name: "Sungai Nil", aliases: ["nil", "nile"], score: 12, fact: "Sungai terpanjang di dunia (6.650 km) di Afrika yang uniknya mengalir dari arah Selatan menuju ke Utara!" },
      { name: "Sungai Amazon", aliases: ["amazon"], score: 14, fact: "Sungai dengan volume air terbesar di dunia—debit airnya lebih besar daripada gabungan 7 sungai terbesar berikutnya, namun tidak memiliki satu pun jembatan yang melintasinya!" },
      { name: "Danau Toba", aliases: ["toba"], score: 15, fact: "Danau vulkanik terbesar di dunia yang terbentuk dari letusan Supervolcano dahsyat sekitar 74.000 tahun yang lalu!" },
      { name: "Sungai Kapuas", aliases: ["kapuas"], score: 18, fact: "Sungai terpanjang di Indonesia yang membentang sepanjang 1.143 kilometer di Kalimantan Barat!" },
      { name: "Sungai Musi", aliases: ["musi"], score: 20, fact: "Sungai sepanjang 750 km yang membelah Kota Palembang menjadi kawasan Seberang Ulu dan Seberang Ilir, dihubungkan oleh Jembatan Ampera." },
      { name: "Sungai Mahakam", aliases: ["mahakam"], score: 22, fact: "Sungai besar di Kalimantan Timur yang menjadi habitat asli lumba-lumba air tawar langka, Pesut Mahakam." },
      { name: "Sungai Bengawan Solo", aliases: ["bengawan solo"], score: 23, fact: "Sungai terpanjang di Pulau Jawa (sekitar 600 km) yang diabadikan dalam lagu keroncong legendaris karya Gesang tahun 1940." },
      { name: "Sungai Ciliwung", aliases: ["ciliwung"], score: 25, fact: "Sungai bersejarah sepanjang 120 km yang berhulu di Gunung Gede-Pangrango dan bermuara di Teluk Jakarta." },
      { name: "Sungai Gangga", aliases: ["gangga", "ganges"], score: 26, fact: "Sungai suci di India dan Bangladesh yang lembahnya menghidupi lebih dari 400 juta penduduk." },

      // KARANG
      { name: "Sungai Barito", aliases: ["barito", "sungai martapura"], score: 38, fact: "Terkenal dengan Pasar Terapung tradisional di Kalimantan Selatan di mana jual-beli dilakukan di atas perahu Jukung sejak pagi buta." },
      { name: "Sungai Brantas", aliases: ["brantas"], score: 42, fact: "Sungai terpanjang kedua di Pulau Jawa yang mengalir melingkari Gunung Kelud di Jawa Timur." },
      { name: "Sungai Citarum", aliases: ["citarum"], score: 40, fact: "Sungai terpanjang di Jawa Barat yang membendung tiga waduk besar pembangkit listrik: Saguling, Cirata, dan Jatiluhur!" },
      { name: "Sungai Mekong", aliases: ["mekong"], score: 45, fact: "Sungai terpanjang di Asia Tenggara (4.350 km) yang mengalir melintasi 6 negara: Tiongkok, Myanmar, Laos, Thailand, Kamboja, dan Vietnam." },
      { name: "Sungai Yangtze", aliases: ["yangtze", "sungai kuning", "hoang ho"], score: 46, fact: "Sungai terpanjang di benua Asia (6.300 km) yang terletak seluruhnya di wilayah Tiongkok." },
      { name: "Sungai Mississippi", aliases: ["mississippi"], score: 48, fact: "Sistem sungai terbesar di Amerika Utara; seekor tetesan air dari hulunya butuh waktu sekitar 90 hari untuk mengalir sampai ke Teluk Meksiko!" },
      { name: "Danau Singkarak", aliases: ["singkarak", "danau maninjau"], score: 49, fact: "Danau tektonik indah di Sumatera Barat yang merupakan rumah asli bagi Ikan Bilih, spesies ikan endemik yang hanya hidup di danau tersebut." },
      { name: "Danau Sentani", aliases: ["sentani"], score: 54, fact: "Danau terluas di Papua yang memiliki 22 pulau kecil di dalamnya dan pernah menjadi habitat Hiu Gergaji air tawar!" },
      { name: "Danau Poso", aliases: ["poso", "danau towuti", "danau matano"], score: 58, fact: "Memiliki pantai berpasir putih keemasan dan air yang sangat jernih di jantung Pulau Sulawesi." },
      { name: "Danau Batur", aliases: ["danau beratan", "bedugul", "danau tamblingan"], score: 52, fact: "Danau Beratan di Bedugul, Bali dengan Pura Ulun Danu di tepinya diabadikan pada uang kertas Rp50.000." },
      { name: "Danau Kelimutu", aliases: ["kelimutu"], score: 56, fact: "Danau kawah tiga warna di Ende, Flores yang warna airnya berubah secara periodik akibat aktivitas mineral vulkanik." },
      { name: "Sungai Siak", aliases: ["siak", "sungai kampar", "sungai indragiri"], score: 60, fact: "Sungai Siak di Riau adalah sungai terdalam di Indonesia (kedalamannya mencapai 30 meter) sehingga kapal kargo besar bisa berlayar masuk ke pedalaman!" },

      // ABISAL
      { name: "Danau Matano", aliases: ["matano"], score: 74, fact: "Terletak di Luwu Timur, Sulawesi Selatan: merupakan danau terdalam di Indonesia sekaligus terdalam di Asia Tenggara (kedalaman 590 meter)!" },
      { name: "Danau Baikal", aliases: ["baikal"], score: 72, fact: "Danau terdalam (1.642 m) dan tertua di dunia di Siberia yang menyimpan 20% dari seluruh cadangan air tawar cair di permukaan Bumi!" },
      { name: "Laut Kaspia", aliases: ["danau kaspia", "laut mati"], score: 70, fact: "Meskipun bernama 'Laut Kaspia', secara geografis ia adalah danau (perairan terkurung daratan) terluas di dunia!" },
      { name: "Danau Victoria", aliases: ["victoria", "danau tanganyika"], score: 75, fact: "Danau terbesar di benua Afrika dan danau tropis terluas di dunia yang menjadi salah satu hulu utama Sungai Nil." },
      { name: "Danau Titicaca", aliases: ["titicaca"], score: 78, fact: "Danau tertinggi di dunia yang dapat dilayari kapal besar (berada di ketinggian 3.812 meter di Pegunungan Andes antara Peru dan Bolivia!)." },
      { name: "Sungai Batanghari", aliases: ["batanghari", "batang hari"], score: 68, fact: "Sungai terpanjang di Pulau Sumatera (sekitar 800 km) yang berhulu di Sumatera Barat dan mengalir melintasi Jambi." },
      { name: "Sungai Mamberamo", aliases: ["mamberamo", "sungai digul", "sungai baliEm"], score: 80, fact: "Sungai terbesar dan terlebar di Papua yang dijuluki sebagai 'Amazon dari Papua' karena keanekaragaman hayati hutannya yang belum terjamah." },
      { name: "Sungai Efrat", aliases: ["efrat", "sungai tigris", "tigris"], score: 77, fact: "Dua sungai kembar yang mengapit wilayah Mesopotamia ('Tanah di Antara Dua Sungai'), tempat lahirnya peradaban kota dan roda." },
      { name: "Sungai Danube", aliases: ["danube", "donau", "sungai rhine", "sungai thames", "sungai seine"], score: 76, fact: "Sungai Danube di Eropa adalah sungai yang melintasi jumlah negara paling banyak di dunia (melewati 10 negara Eropa!)." },
      { name: "Sungai Kongo", aliases: ["kongo", "congo"], score: 82, fact: "Sungai terdalam di dunia dengan palung sungai mencapai kedalaman lebih dari 220 meter dan satu-satunya sungai besar yang memotong garis khatulistiwa dua kali!" },

      // LEGENDA PALUNG
      { name: "Danau Kakaban", aliases: ["kakaban", "danau labuan cermin", "labuan cermin"], score: 92, fact: "Danau Kakaban di Kalimantan Timur adalah danau air payau purba tempat jutaan ubur-ubur berevolusi kehilangan sengatnya karena tidak memiliki predator!" },
      { name: "Danau Gunung Tujuh", aliases: ["gunung tujuh"], score: 94, fact: "Terletak di ketinggian 1.950 mdpl di kawasan Kerinci Seblat, Jambi, menjadikannya danau kaldera tertinggi di Asia Tenggara!" },
      { name: "Sungai Tamborasi", aliases: ["tamborasi"], score: 96, fact: "Terletak di Kolaka, Sulawesi Tenggara: merupakan salah satu sungai terpendek di dunia dengan panjang dari mata air tebing langsung ke bibir pantai laut hanya 20 meter!" },
      { name: "Danau Habema", aliases: ["habema", "danau paniai", "danau tigi"], score: 98, fact: "Danau Habema (Yuginopa) di kaki Puncak Trikora Papua berada di ketinggian 3.225 meter di atas permukaan laut, dijuluki 'Danau di Atas Awan' tertinggi di Indonesia!" }
    ]
  }
];

module.exports = { EXTRA_CATEGORIES };
