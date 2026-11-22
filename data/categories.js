// Database Kategori & Jawaban Berjenjang (Rarity-Based Open-Ended Trivia)
// Terinspirasi dari Krillion.io dengan pengayaan Edukasi, Sains, Geografi, & Budaya Nusantara.
// Skor 10 - 34  : PLANKTON (Umum / Pasaran) -> 100m - 340m
// Skor 35 - 64  : KARANG (Cukup Unik)       -> 350m - 640m
// Skor 65 - 88  : ABISAL (Langka / Deep Cut)-> 650m - 880m
// Skor 89 - 100 : LEGENDA PALUNG (1 in a Krillion!) -> 890m - 1000m

const CATEGORIES = [
  {
    id: "negara-asia",
    title: "Sebutkan Negara di Benua Asia",
    theme: "geografi",
    hint: "Ada 48+ negara yang diakui di Asia, dari Asia Tenggara hingga Asia Tengah & Timur Tengah!",
    educationalNote: "Asia adalah benua terbesar di dunia yang mencakup sekitar 30% luas daratan Bumi dan 60% populasi dunia.",
    answers: [
      // PLANKTON (Umum)
      { name: "Indonesia", aliases: ["ri", "republik indonesia"], score: 12, fact: "Negara kepulauan terbesar di dunia dengan lebih dari 17.000 pulau." },
      { name: "Jepang", aliases: ["japan", "nippon"], score: 15, fact: "Memiliki lebih dari 6.800 pulau dan tingkat harapan hidup tertinggi di dunia." },
      { name: "Tiongkok", aliases: ["china", "cina", "rrt", "prc"], score: 15, fact: "Memiliki satu zona waktu resmi (Waktu Beijing) meskipun wilayahnya membentang sepanjang 5 zona waktu geografis." },
      { name: "Korea Selatan", aliases: ["korsel", "south korea", "korea"], score: 16, fact: "Salah satu negara dengan koneksi internet tercepat dan penetrasi broadband tertinggi di dunia." },
      { name: "Malaysia", aliases: [], score: 18, fact: "Gua Sarawak di Malaysia adalah ruang bawah tanah terbesar di dunia berdasarkan luas area." },
      { name: "Singapura", aliases: ["singapore"], score: 19, fact: "Salah satu dari tiga negara-kota berdaulat yang masih ada di dunia saat ini." },
      { name: "India", aliases: ["bharat"], score: 20, fact: "Negara dengan populasi terbesar di dunia saat ini dan tempat lahirnya permainan catur (Chaturanga)." },
      { name: "Arab Saudi", aliases: ["saudi arabia", "saudi", "arab"], score: 22, fact: "Negara terbesar di dunia yang tidak memiliki sungai permanen yang mengalir sepanjang tahun." },
      { name: "Thailand", aliases: ["muangthai", "siam"], score: 23, fact: "Satu-satunya negara di Asia Tenggara yang tidak pernah dijajah oleh bangsa Eropa." },
      { name: "Vietnam", aliases: [], score: 26, fact: "Produsen kopi Robusta terbesar di dunia dan rumah bagi gua terbesar di dunia, Son Doong." },
      { name: "Filipina", aliases: ["philippines"], score: 28, fact: "Memiliki Palung Filipina dan merupakan salah satu negara dengan garis pantai terpanjang di dunia." },
      { name: "Korea Utara", aliases: ["korut", "north korea"], score: 30, fact: "Menggunakan kalender Juche yang dihitung mulai tahun 1912." },

      // KARANG (Cukup Unik)
      { name: "Turki", aliases: ["turkiye", "turkey"], score: 38, fact: "Kota Istanbul di Turki adalah satu-satunya kota besar di dunia yang berada di dua benua sekaligus (Asia dan Eropa)." },
      { name: "Qatar", aliases: [], score: 40, fact: "Salah satu negara dengan PDB per kapita tertinggi di dunia dan tidak memiliki hutan alami." },
      { name: "Uni Emirat Arab", aliases: ["uea", "uae", "dubai"], score: 42, fact: "Memiliki Kementerian Kecerdasan Buatan (AI) pertama di dunia sejak tahun 2017." },
      { name: "Pakistan", aliases: [], score: 44, fact: "Rumah bagi K2, gunung tertinggi kedua di dunia, dan pelabuhan laut dalam Gwadar." },
      { name: "Iran", aliases: ["persia"], score: 45, fact: "Salah satu peradaban tertua yang terus dihuni di dunia sejak zaman Elam dan Persia Kuno." },
      { name: "Irak", aliases: ["iraq"], score: 47, fact: "Terletak di wilayah Mesopotamia kuno (antara Sungai Tigris dan Efrat) yang dikenal sebagai tempat lahirnya tulisan aksara paku." },
      { name: "Myanmar", aliases: ["burma"], score: 48, fact: "Salah satu dari hanya tiga negara di dunia yang belum sepenuhnya mengadopsi sistem metrik secara resmi." },
      { name: "Kamboja", aliases: ["cambodia"], score: 50, fact: "Bendera Kamboja adalah satu-satunya bendera nasional di dunia yang menampilkan gambar bangunan (Angkor Wat)." },
      { name: "Laos", aliases: [], score: 54, fact: "Satu-satunya negara di Asia Tenggara yang terkurung daratan (landlocked) tanpa garis pantai." },
      { name: "Brunei Darussalam", aliases: ["brunei"], score: 56, fact: "Memiliki Kampong Ayer, permukiman atas air terbesar di dunia yang telah dihuni selama berabad-abad." },
      { name: "Bangladesh", aliases: [], score: 58, fact: "Memiliki delta sungai terbesar di dunia (Delta Gangga-Brahmaputra) dan hutan bakau Sundarbans." },
      { name: "Sri Lanka", aliases: ["ceylon"], score: 60, fact: "Eksportir kayu manis asli (Cinnamomum verum) terbesar di dunia." },
      { name: "Nepal", aliases: [], score: 62, fact: "Satu-satunya negara di dunia yang benderanya tidak berbentuk persegi atau persegi panjang." },
      { name: "Mongolia", aliases: [], score: 64, fact: "Negara berdaulat dengan kepadatan penduduk paling rendah di dunia (sekitar 2 orang per km persegi)." },

      // ABISAL (Langka)
      { name: "Timor Leste", aliases: ["timor timur", "east timor"], score: 68, fact: "Negara termuda di Asia Tenggara yang merdeka secara penuh pada tahun 2002." },
      { name: "Kazakhstan", aliases: ["kazakstan"], score: 70, fact: "Negara terkurung daratan (landlocked) terbesar di dunia dan tempat peluncuran manusia pertama ke luar angkasa (Kosmodrom Baikonur)." },
      { name: "Uzbekistan", aliases: [], score: 74, fact: "Salah satu dari dua negara di dunia yang 'doubly landlocked' (dikelilingi oleh negara-negara yang juga tidak punya laut)." },
      { name: "Yordania", aliases: ["jordan"], score: 75, fact: "Berbagi titik terendah di permukaan daratan Bumi, yaitu pesisir Laut Mati (-430 meter di bawah permukaan laut)." },
      { name: "Oman", aliases: [], score: 77, fact: "Negara merdeka tertua di dunia Arab yang terkenal dengan sistem irigasi kuno Aflaj (Warisan Dunia UNESCO)." },
      { name: "Yaman", aliases: ["yemen"], score: 78, fact: "Memiliki Pulau Socotra yang terkenal dengan Pohon Darah Naga (Dragon's Blood Tree) yang tampak seperti planet lain." },
      { name: "Suriah", aliases: ["syria"], score: 76, fact: "Ibu kotanya, Damaskus, sering disebut sebagai salah satu kota tertua di dunia yang terus dihuni manusia." },
      { name: "Lebanon", aliases: ["libanon"], score: 79, fact: "Satu-satunya negara di Timur Tengah yang tidak memiliki gurun pasir." },
      { name: "Kuwait", aliases: [], score: 80, fact: "Mata uangnya, Dinar Kuwait (KWD), adalah mata uang dengan nilai tukar tertinggi di dunia." },
      { name: "Afganistan", aliases: ["afghanistan"], score: 72, fact: "Sumber utama batu permata Lapis Lazuli terbaik di dunia selama lebih dari 6.000 tahun." },
      { name: "Maladewa", aliases: ["maldives"], score: 82, fact: "Negara dengan rata-rata ketinggian daratan paling rendah di dunia (hanya sekitar 1,5 meter di atas permukaan laut)." },
      { name: "Georgia", aliases: [], score: 85, fact: "Memiliki Gua Veryovkina, gua terdalam yang diketahui di Bumi dengan kedalaman lebih dari 2.200 meter!" },
      { name: "Armenia", aliases: [], score: 86, fact: "Negara pertama dalam sejarah yang mengadopsi agama Kristen sebagai agama negara pada tahun 301 Masehi." },
      { name: "Azerbaijan", aliases: [], score: 87, fact: "Dikenal sebagai 'Tanah Api' karena adanya semburan gas alam bawah tanah yang menyala abadi di bukit Yanar Dag." },

      // LEGENDA PALUNG (1 in a Krillion!)
      { name: "Bhutan", aliases: [], score: 92, fact: "Satu-satunya negara karbon-negatif di dunia dan mengukur kemajuan negara dengan indeks 'Kebahagiaan Nasional Bruto' (GNH)." },
      { name: "Kirgizstan", aliases: ["kyrgyzstan", "kirgistan"], score: 95, fact: "Danau Issyk-Kul di Kirgizstan adalah danau pegunungan terbesar kedua di dunia yang tidak pernah membeku meski di musim dingin." },
      { name: "Tajikistan", aliases: ["tadzhikistan"], score: 96, fact: "Lebih dari 90% wilayah negaranya berupa pegunungan tinggi (Pegunungan Pamir, 'Atap Dunia')." },
      { name: "Turkmenistan", aliases: [], score: 97, fact: "Rumah bagi Kawah Gas Darvaza ('Gerbang Neraka') yang telah menyala terus-menerus di tengah gurun Karakum sejak 1971." },
      { name: "Bahrain", aliases: [], score: 91, fact: "Negara kepulauan di Teluk Persia yang terkenal sejak zaman kuno karena mata air tawar yang memancar di dasar laut asin." },
      { name: "Siprus", aliases: ["cyprus"], score: 98, fact: "Pulau di Mediterania Timur yang secara geografis berada di Asia Barat dan terkenal sebagai pusat tembaga zaman kuno." }
    ]
  },

  {
    id: "unsur-kimia",
    title: "Sebutkan Unsur di Tabel Periodik",
    theme: "sains",
    hint: "Ada 118 unsur kimia resmi dari Hidrogen (1) hingga Oganeson (118)!",
    educationalNote: "Tabel Periodik disusun oleh Dmitri Mendeleev pada tahun 1869 berdasarkan sifat kimia dan nomor atom unsur.",
    answers: [
      // PLANKTON
      { name: "Oksigen", aliases: ["oxygen", "o"], score: 12, fact: "Menyusun sekitar 21% atmosfer Bumi tetapi hampir separuh dari massa kerak Bumi!" },
      { name: "Hidrogen", aliases: ["hydrogen", "h"], score: 14, fact: "Unsur paling melimpah di alam semesta, menyusun sekitar 75% dari seluruh materi normal." },
      { name: "Karbon", aliases: ["carbon", "c"], score: 16, fact: "Basis dari seluruh kehidupan organik di Bumi; bisa membentuk grafit yang lunak maupun berlian yang super keras." },
      { name: "Besi", aliases: ["ferrum", "iron", "fe"], score: 18, fact: "Inti Bumi sebagian besar tersusun atas besi cair dan padat yang menghasilkan medan magnet pelindung Bumi." },
      { name: "Emas", aliases: ["aurum", "gold", "au"], score: 18, fact: "Sangat mudah ditempa: 1 gram emas dapat ditempa menjadi lembaran tipis seluas 1 meter persegi!" },
      { name: "Perak", aliases: ["argentum", "silver", "ag"], score: 22, fact: "Logam dengan daya hantar listrik dan panas paling tinggi di antara seluruh unsur di tabel periodik." },
      { name: "Nitrogen", aliases: ["n"], score: 24, fact: "Menyusun 78% udara yang kita hirup setiap hari." },
      { name: "Helium", aliases: ["he"], score: 25, fact: "Pertama kali ditemukan di atmosfer Matahari melalui analisis spektrum cahaya sebelum ditemukan di Bumi!" },
      { name: "Tembaga", aliases: ["cuprum", "copper", "cu"], score: 27, fact: "Logam pertama yang diolah manusia sejak lebih dari 10.000 tahun lalu dan bersifat antibakteri alami." },
      { name: "Aluminium", aliases: ["al", "aluminum"], score: 28, fact: "Dulu pada abad ke-19 sempat lebih mahal daripada emas karena sulit dimurnikan, sebelum proses Hall-Héroult ditemukan." },
      { name: "Kalsium", aliases: ["calcium", "ca"], score: 30, fact: "Logam paling melimpah di dalam tubuh manusia, menjadi komponen utama tulang dan gigi." },
      { name: "Natrium", aliases: ["sodium", "na"], score: 32, fact: "Logam lunak yang meledak jika terkena air, tetapi saat berikatan dengan Klorin menjadi garam dapur yang kita makan!" },

      // KARANG
      { name: "Klorin", aliases: ["chlorine", "klor", "cl"], score: 38, fact: "Penting untuk menjernihkan air minum dan membentuk garam dapur (NaCl)." },
      { name: "Kalium", aliases: ["potassium", "k"], score: 40, fact: "Sangat penting untuk pengiriman sinyal saraf di tubuh manusia; banyak ditemukan pada pisang dan kentang." },
      { name: "Seng", aliases: ["zinc", "zn", "zink"], score: 42, fact: "Digunakan untuk melapisi besi (galvanisasi) agar tidak berkarat dan penting untuk sistem imun tubuh." },
      { name: "Nikel", aliases: ["nickel", "ni"], score: 44, fact: "Indonesia memiliki cadangan nikel terbesar di dunia yang krusial untuk pembuatan baterai kendaraan listrik." },
      { name: "Timah", aliases: ["stannum", "tin", "sn"], score: 45, fact: "Memiliki fenomena unik bernama 'Tin Pest' di mana timah padat bisa hancur menjadi bubuk pada suhu sangat dingin." },
      { name: "Timbal", aliases: ["plumbum", "lead", "pb"], score: 48, fact: "Logam padat yang sangat efektif menahan radiasi sinar-X dan sinar gamma." },
      { name: "Merkuri", aliases: ["raksa", "air raksa", "hydrargyrum", "hg", "mercury"], score: 46, fact: "Satu-satunya logam yang berwujud cair pada suhu dan tekanan ruang standar." },
      { name: "Uranium", aliases: ["u"], score: 50, fact: "Satu pelet bahan bakar uranium seukuran ujung jari mengandung energi setara 1 ton batu bara!" },
      { name: "Neon", aliases: ["ne"], score: 52, fact: "Gas mulia yang memancarkan cahaya merah-oranye terang ketika dialiri listrik tegangan tinggi." },
      { name: "Silikon", aliases: ["silicon", "si"], score: 53, fact: "Semikonduktor utama yang menjadi otak dari hampir seluruh chip komputer dan ponsel modern." },
      { name: "Magnesium", aliases: ["mg"], score: 55, fact: "Atom yang berada tepat di jantung molekul klorofil pada setiap daun tumbuhan hijau." },
      { name: "Fosfor", aliases: ["phosphorus", "p"], score: 57, fact: "Unsur pertama yang penemunya tercatat dalam sejarah (Hennig Brand pada tahun 1669) dan menyusun rantai DNA kita." },
      { name: "Belerang", aliases: ["sulfur", "sulphur", "s"], score: 56, fact: "Memberikan bau khas pada kawah gunung berapi dan mata air panas." },
      { name: "Litium", aliases: ["lithium", "li"], score: 60, fact: "Logam paling ringan di tabel periodik—begitu ringan hingga bisa mengapung di atas minyak!" },
      { name: "Platina", aliases: ["platinum", "pt"], score: 62, fact: "Logam mulia tahan karat yang digunakan pada konverter katalitik kendaraan untuk mengurangi polusi." },
      { name: "Titanium", aliases: ["ti"], score: 64, fact: "Sekuat baja namun 45% lebih ringan, serta tidak ditolak oleh jaringan tulang manusia sehingga dipakai untuk implan medis." },

      // ABISAL
      { name: "Argon", aliases: ["ar"], score: 68, fact: "Gas mulia yang menyusun hampir 1% atmosfer Bumi dan digunakan di dalam bola lampu pijar." },
      { name: "Kripton", aliases: ["krypton", "kr"], score: 72, fact: "Bukan cuma planet asal Superman! Kripton adalah gas mulia nyata yang digunakan dalam lampu fotografi kecepatan tinggi." },
      { name: "Xenon", aliases: ["xe"], score: 74, fact: "Digunakan sebagai bahan bakar mesin pendorong ion (Ion Thruster) pada wahana antariksa NASA." },
      { name: "Radon", aliases: ["rn"], score: 75, fact: "Gas mulia radioaktif tak berwarna yang muncul secara alami dari peluruhan uranium di bebatuan tanah." },
      { name: "Kobalt", aliases: ["cobalt", "co"], score: 73, fact: "Memberikan warna biru tua yang memukau pada kaca dan keramik sejak zaman Mesir Kuno." },
      { name: "Kromium", aliases: ["chromium", "krom", "cr"], score: 76, fact: "Unsur yang membuat baja tahan karat (stainless steel) berkilau dan membuat batu rubi berwarna merah." },
      { name: "Mangan", aliases: ["manganese", "mn"], score: 77, fact: "Bongkahan nodul mangan bertebaran dalam jumlah jutaan ton di dasar samudra dalam." },
      { name: "Bromin", aliases: ["brom", "bromine", "br"], score: 78, fact: "Bersama merkuri, bromin adalah satu dari hanya dua unsur di tabel periodik yang berwujud cair pada suhu kamar." },
      { name: "Iodin", aliases: ["yodium", "iodium", "iodine", "i"], score: 71, fact: "Ditambahkan ke dalam garam dapur untuk mencegah penyakit gondok dan menjaga hormon tiroid." },
      { name: "Fluorin", aliases: ["fluor", "fluorine", "f"], score: 75, fact: "Unsur paling elektronegatif dan paling reaktif di seluruh tabel periodik." },
      { name: "Plutonium", aliases: ["pu"], score: 76, fact: "Plutonium-238 digunakan sebagai baterai nuklir (RTG) yang menghidupkan rover Perseverance di Mars dan wahana Voyager." },
      { name: "Radium", aliases: ["ra"], score: 80, fact: "Ditemukan oleh Marie dan Pierre Curie pada tahun 1898 dari bijih pitchblende." },
      { name: "Arsenik", aliases: ["arsen", "arsenic", "as"], score: 79, fact: "Metaloid yang terkenal dalam kisah detektif klasik, namun dalam jumlah mikro digunakan pada semikonduktor." },
      { name: "Tungsten", aliases: ["wolfram", "w"], score: 84, fact: "Logam dengan titik leleh tertinggi di dunia (3.422 °C!), sehingga dipakai sebagai filamen lampu dan pelindung roket." },
      { name: "Galium", aliases: ["gallium", "ga"], score: 86, fact: "Logam padat yang memiliki titik leleh 29,7 °C—akan meleleh menjadi cair hanya dengan digenggam di telapak tanganmu!" },
      { name: "Bismut", aliases: ["bismuth", "bi"], score: 88, fact: "Membentuk kristal pelangi berundak-undak yang sangat indah dan merupakan bahan aktif obat sakit perut (Pepto-Bismol)." },

      // LEGENDA PALUNG
      { name: "Molibdenum", aliases: ["molybdenum", "mo"], score: 92, fact: "Penting bagi enzim pengikat nitrogen pada bakteri tanah yang menyuburkan tanaman secara alami." },
      { name: "Sesium", aliases: ["caesium", "cesium", "cs"], score: 93, fact: "Getaran atom Sesium-133 digunakan sebagai standar jam atom dunia untuk mendefinisikan tepat 1 detik!" },
      { name: "Osmium", aliases: ["os"], score: 95, fact: "Unsur alami paling padat (paling berat per satuan volume) di Bumi—dua kali lebih padat daripada timbal!" },
      { name: "Iridium", aliases: ["ir"], score: 96, fact: "Lapisan tipis Iridium di seluruh dunia menjadi bukti utama bahwa asteroid raksasa memusnahkan dinosaurus 66 juta tahun lalu." },
      { name: "Teknesium", aliases: ["technetium", "tc"], score: 97, fact: "Unsur paling ringan yang tidak memiliki isotop stabil (100% radioaktif) dan sangat penting untuk pemindaian medis di rumah sakit." },
      { name: "Neodimium", aliases: ["neodymium", "nd"], score: 94, fact: "Logam tanah jarang yang digunakan untuk membuat magnet permanen paling kuat di dunia (ada di dalam headphone dan hard disk!)." },
      { name: "Oganeson", aliases: ["oganesson", "og"], score: 99, fact: "Unsur terberat di Tabel Periodik saat ini (Nomor Atom 118), dinamai dari fisikawan nuklir Yuri Oganessian." },
      { name: "Astatin", aliases: ["astatine", "at"], score: 100, fact: "Unsur alami paling langka di kerak Bumi: pada satu waktu, total jumlah astatin alami di seluruh planet Bumi kurang dari 1 gram!" }
    ]
  },

  {
    id: "kuliner-kuah-nusantara",
    title: "Sebutkan Makanan Berkuah Khas Indonesia",
    theme: "nusantara",
    hint: "Dari soto, sup tradisional, hingga hidangan bersantan dari Sabang sampai Merauke!",
    educationalNote: "Indonesia dijuluki negeri seribu soto dan kuliner berkuah karena kekayaan rempah seperti kunyit, serai, lengkuas, dan kemiri.",
    answers: [
      // PLANKTON
      { name: "Bakso", aliases: ["baso", "bakso malang", "bakso solo"], score: 12, fact: "Perpaduan budaya kuliner Tionghoa-Indonesia yang kini memiliki ratusan variasi di seluruh Nusantara." },
      { name: "Soto Ayam", aliases: ["soto", "soto lamongan", "soto madura", "soto kudus"], score: 14, fact: "Dinobatkan oleh CNN Travel sebagai salah satu dari 20 sup terbaik di dunia!" },
      { name: "Mie Ayam", aliases: ["mi ayam", "mie bakso"], score: 16, fact: "Adaptasi lokal dari Bakmi dengan topping ayam kecap manis gurih dan kuah kaldu terpisah." },
      { name: "Rawon", aliases: ["nasi rawon"], score: 19, fact: "Pernah dinobatkan oleh TasteAtlas sebagai Sup Terbaik Nomor 1 di Dunia! Warna hitamnya berasal dari biji Kluwek." },
      { name: "Sop Buntut", aliases: ["sup buntut"], score: 22, fact: "Hidangan buntut sapi berkuah kaldu bening kaya pala dan cengkeh yang populer hingga ke restoran hotel dunia." },
      { name: "Sayur Asem", aliases: ["sayur asam"], score: 23, fact: "Kuah segar yang rasa asam alaminya berasal dari asam jawa dan belimbing wuluh." },
      { name: "Sayur Lodeh", aliases: ["lodeh"], score: 25, fact: "Sayur bersantan khas Jawa yang memiliki makna filosofis tolak bala dalam tradisi masyarakat Yogyakarta." },
      { name: "Opor Ayam", aliases: ["opor"], score: 26, fact: "Hidangan wajib saat Lebaran yang memadukan santan, serai, kencur, dan ketumbar." },
      { name: "Gulai", aliases: ["gulai ayam", "gulai kambing", "gulai ikan", "gule"], score: 27, fact: "Teknik memasak berkuah santan berbumbu kunyit dan rempah lengkap yang menjadi dasar banyak masakan Sumatera." },
      { name: "Seblak", aliases: ["seblak kuah"], score: 28, fact: "Kuliner khas Sunda berbahan kerupuk basah dengan bumbu utama kencur (cikur) yang aromatik." },
      { name: "Soto Betawi", aliases: [], score: 30, fact: "Keunikannya terletak pada penggunaan campuran santan dan susu segar untuk kuahnya yang creamy." },
      { name: "Tongseng", aliases: ["tongseng kambing", "tongseng sapi"], score: 32, fact: "Berasal dari Kecamatan Klego, Boyolali, memadukan kuah gulai dengan kecap manis, kol, dan tomat segar." },

      // KARANG
      { name: "Coto Makassar", aliases: ["coto"], score: 38, fact: "Kuahnya yang kental dan gurih berasal dari 40 jenis rempah tradisional(" + "Ampah Patang Pulo) dan kacang tanah tumbuk!" },
      { name: "Tekwan", aliases: [], score: 42, fact: "Sup bola-bola ikan tenggiri khas Palembang dengan kuah kaldu udang, jamur kuping, dan bunga sedap malam." },
      { name: "Pempek Kapal Selam", aliases: ["pempek", "model", "model palembang"], score: 44, fact: "Disajikan dengan kuah Cuko berwarna gelap yang terbuat dari gula aren, cabai rawit, dan bawang putih." },
      { name: "Tengkleng", aliases: ["tengkleng solo"], score: 48, fact: "Kuliner khas Solo berbahan tulang dan iga kambing dengan kuah encer kaya rempah yang lahir pada masa sulit penjajahan." },
      { name: "Soto Banjar", aliases: [], score: 50, fact: "Soto khas Kalimantan Selatan yang beraroma kayu manis, pala, dan cengkeh, disajikan dengan perkedel singkong." },
      { name: "Sop Konro", aliases: ["konro"], score: 52, fact: "Sup iga sapi khas Bugis-Makassar yang berkuah cokelat kehitaman dari buah kluwek dan ketumbar." },
      { name: "Lontong Sayur", aliases: ["ketupat sayur", "lontong sayur padang"], score: 45, fact: "Menu sarapan ikonik dengan kuah santan labu siam, nangka muda, atau pakis." },
      { name: "Pindang Patin", aliases: ["pindang", "pindang tulang", "pindang ikan"], score: 55, fact: "Hidangan khas Sumatera Selatan dengan perpaduan rasa pedas, asam nanas, dan segar kemangi." },
      { name: "Empal Gentong", aliases: [], score: 56, fact: "Kuliner khas Cirebon yang dimasak menggunakan kayu pohon asam di dalam gentong (periuk tanah liat) selama berjam-jam." },
      { name: "Mie Aceh", aliases: ["mi aceh"], score: 54, fact: "Mie kuning tebal yang disajikan dengan kuah kari kental kaya kapulaga, jintan, dan lada." },
      { name: "Soto Mie Bogor", aliases: ["soto mie"], score: 58, fact: "Unik karena memadukan daging sapi, kikil, mie kuning, dan potongan risol goreng renyah di dalam kuah kaldu!" },
      { name: "Garang Asem", aliases: [], score: 62, fact: "Olahan ayam khas Jawa Tengah yang dikukus di dalam bungkus daun pisang bersama belimbing wuluh dan santan." },
      { name: "Pallubasa", aliases: ["palubasa"], score: 64, fact: "Saudara dekat Coto Makassar yang dibedakan dengan taburan kelapa parut sangrai yang membuat kuahnya makin gurih." },

      // ABISAL
      { name: "Papeda Kuah Kuning", aliases: ["papeda", "ikan kuah kuning"], score: 70, fact: "Makanan pokok sagu khas Maluku dan Papua yang selalu disantap dengan Ikan Tongkol/Mubara Kuah Kuning segar." },
      { name: "Brongkos", aliases: ["sayur brongkos"], score: 74, fact: "Kuliner berkuah santan dan kluwek khas Yogyakarta yang berisi daging sapi, tahu, dan kacang tolo." },
      { name: "Tinutuan", aliases: ["bubur manado"], score: 75, fact: "Kuliner sehat khas Sulawesi Utara yang penuh sayuran seperti labu kuning, daun gedi, bayam, dan kemangi." },
      { name: "Laksan", aliases: ["celimpungan"], score: 78, fact: "Kuliner Palembang berbahan adonan ikan dan sagu berbentuk oval yang disajikan dalam kuah santan kemerahan." },
      { name: "Laksa Bogor", aliases: ["laksa", "laksa betawi", "laksa tangerang"], score: 73, fact: "Laksa khas Bogor menggunakan oncom merah di dalam kuah santan kuningnya sehingga punya cita rasa unik." },
      { name: "Kaledo", aliases: ["sup kaledo"], score: 82, fact: "Singkatan dari 'Kaki Lembu Donggala' dari Sulawesi Tengah; sumsum tulangnya diseruput langsung memakai sedotan!" },
      { name: "Gulai Belacan", aliases: [], score: 84, fact: "Kuliner khas Riau yang memadukan kuah santan dengan terasi (belacan) udang pilihan dan asam jawa." },
      { name: "Brenebon", aliases: ["sup brenebon"], score: 85, fact: "Sup kacang merah khas Minahasa yang namanya diadaptasi dari bahasa Belanda 'Bruine Bonen' (kacang cokelat)." },
      { name: "Selat Solo", aliases: [], score: 76, fact: "Bistik daging sapi berkuah cokelat manis-asam segar hasil akulturasi kuliner Eropa dan Keraton Surakarta." },
      { name: "Tauto Pekalongan", aliases: ["tauto", "soto tauto"], score: 88, fact: "Perpaduan soto dan tauco (fermentasi kedelai) khas Pekalongan yang memiliki rasa gurih-manis-asam yang pekat." },

      // LEGENDA PALUNG
      { name: "Gangan", aliases: ["lempah kuning", "gangan belitung"], score: 92, fact: "Sup ikan khas Pulau Belitung dan Bangka dengan kuah kuning kunyit, lengkuas, dan potongan buah nanas." },
      { name: "Gohu Ikan", aliases: ["sop saudara", "konro bakar"], score: 90, fact: "Sop Saudara adalah kuliner berkuah khas Pangkep, Sulawesi Selatan yang disajikan dengan ikan bolu bakar." },
      { name: "Kučai", aliases: ["jukut ares", "ares"], score: 95, fact: "Jukut Ares adalah sayur berkuah khas Bali dan Lombok yang dibuat dari batang pohon pisang muda (gedebog) pilihan!" },
      { name: "Sayur Babanci", aliases: ["ketupat babanci"], score: 96, fact: "Kuliner langka khas Betawi yang namanya Sayur tetapi sama sekali tidak memakai sayuran—melainkan daging sapi, air kelapa, dan 21 rempah!" },
      { name: "Rumpu Rampe", aliases: ["kuah asam ntt", "ikan kuah asam"], score: 94, fact: "Ikan Kuah Asam khas NTT dimasak dengan belimbing wuluh, tomat, dan kemangi menggunakan air laut atau air tawar segar." },
      { name: "Becek Menthok", aliases: ["soto kletuk", "pindang serani"], score: 98, fact: "Pindang Serani adalah sup ikan laut khas pesisir Jepara dengan kuah bening pedas-asam tanpa santan yang sangat segar." }
    ]
  },

  {
    id: "mamalia",
    title: "Sebutkan Hewan Mamalia (Darat maupun Laut)",
    theme: "sains",
    hint: "Hewan menyusui yang bernapas dengan paru-paru—mulai dari hewan peliharaan hingga penghuni samudra dan hutan!",
    educationalNote: "Mamalia memiliki kelenjar susu untuk menyusui anaknya, berdarah panas, dan hampir semuanya melahirkan (kecuali monotremata seperti Platipus).",
    answers: [
      // PLANKTON
      { name: "Kucing", aliases: ["cat"], score: 12, fact: "Kucing menghabiskan sekitar 70% hidupnya untuk tidur dan memiliki 32 otot di setiap telinganya." },
      { name: "Anjing", aliases: ["dog"], score: 13, fact: "Indra penciuman anjing 10.000 hingga 100.000 kali lebih tajam dibandingkan manusia." },
      { name: "Sapi", aliases: ["lembu", "cow"], score: 15, fact: "Memiliki satu lambung dengan empat ruang pencernaan dan memiliki sahabat dekat di dalam kawanannya." },
      { name: "Kambing", aliases: ["goat"], score: 16, fact: "Memiliki pupil mata berbentuk persegi panjang horizontal yang memberi pandangan hampir 320 derajat!" },
      { name: "Kuda", aliases: ["horse"], score: 18, fact: "Bisa tidur sambil berdiri berkat sistem pengunci tendon di kakinya (stay apparatus)." },
      { name: "Singa", aliases: ["lion"], score: 18, fact: "Auman singa dewasa dapat terdengar hingga jarak 8 kilometer jauhnya!" },
      { name: "Harimau", aliases: ["macan", "tiger", "harimau sumatera"], score: 19, fact: "Belang harimau tidak hanya ada di bulunya, tetapi juga tercetak langsung di kulitnya seperti sidik jari manusia." },
      { name: "Gajah", aliases: ["elephant"], score: 20, fact: "Belalai gajah memiliki lebih dari 40.000 otot dan gajah adalah satu-satunya mamalia yang tidak bisa melompat." },
      { name: "Paus", aliases: ["paus biru", "whale", "ikan paus"], score: 22, fact: "Paus Biru adalah hewan terbesar yang pernah hidup di Bumi—jantungnya saja seukuran mobil kecil!" },
      { name: "Lumba-lumba", aliases: ["lumba lumba", "dolphin"], score: 24, fact: "Tidur dengan mematikan separuh otaknya secara bergantian agar tetap bisa naik ke permukaan untuk bernapas." },
      { name: "Monyet", aliases: ["kera", "monkey"], score: 24, fact: "Hidup berkelompok dan menggunakan berbagai ekspresi wajah serta suara untuk berkomunikasi." },
      { name: "Kelinci", aliases: ["rabbit"], score: 26, fact: "Giginya tidak pernah berhenti tumbuh sepanjang hidupnya, sehingga harus terus mengunyah serat." },
      { name: "Tikus", aliases: ["mouse", "rat"], score: 27, fact: "Mampu tertawa dalam frekuensi ultrasonik ketika digelitik atau sedang bermain." },
      { name: "Kelelawar", aliases: ["kalong", "bat"], score: 30, fact: "Satu-satunya mamalia di dunia yang benar-benar bisa terbang secara aktif (bukan sekadar melayang)." },

      // KARANG
      { name: "Jerapah", aliases: ["giraffe"], score: 36, fact: "Meskipun lehernya sangat panjang, jumlah tulang leher jerapah sama persis dengan manusia: hanya 7 ruas!" },
      { name: "Zebra", aliases: [], score: 38, fact: "Kulit zebra di balik bulunya sebenarnya berwarna hitam, dan pola belangnya membantu mengusir lalat penghisap darah." },
      { name: "Beruang", aliases: ["beruang kutub", "beruang madu", "bear"], score: 39, fact: "Beruang Madu adalah spesies beruang terkecil di dunia yang hidup di hutan tropis Indonesia." },
      { name: "Panda", aliases: ["giant panda"], score: 40, fact: "Menghabiskan 12 jam sehari untuk makan hingga 12–38 kg bambu setiap harinya." },
      { name: "Kanguru", aliases: ["kangguru", "kangaroo"], score: 42, fact: "Tidak bisa berjalan mundur karena bentuk kaki belakang dan ekornya yang tebal." },
      { name: "Koala", aliases: [], score: 44, fact: "Sidik jari koala sangat mirip dengan sidik jari manusia hingga sulit dibedakan bahkan di bawah mikroskop!" },
      { name: "Badak", aliases: ["badak jawa", "badak sumatera", "rhino"], score: 46, fact: "Cula badak tidak terbuat dari tulang, melainkan dari keratin padat—zat yang sama dengan rambut dan kuku kita." },
      { name: "Kuda Nil", aliases: ["hippopotamus", "hippo"], score: 48, fact: "Menghasilkan cairan kulit berwarna kemerahan yang berfungsi sebagai tabir surya alami dan antibiotik." },
      { name: "Unta", aliases: ["camel"], score: 47, fact: "Punuk unta tidak menyimpan air, melainkan menyimpan cadangan lemak yang bisa diubah menjadi energi dan air metabolisme." },
      { name: "Serigala", aliases: ["wolf"], score: 50, fact: "Berkomunikasi dengan lolongan untuk menyatukan kawanan dan memberi tahu posisi mereka dari jarak berkilo-kilometer." },
      { name: "Rubah", aliases: ["fox"], score: 52, fact: "Menggunakan medan magnet Bumi untuk memperkirakan jarak dan arah saat melompat menangkap mangsa di bawah salju!" },
      { name: "Orangutan", aliases: ["orang utan"], score: 54, fact: "Kera besar asli hutan Sumatera dan Kalimantan yang berbagi sekitar 97% kesamaan DNA dengan manusia." },
      { name: "Simpanse", aliases: ["chimpanzee"], score: 55, fact: "Mamalia cerdas yang mampu membuat dan menggunakan peralatan seperti tongkat untuk mengambil rayap." },
      { name: "Gorila", aliases: ["gorilla"], score: 56, fact: "Hidup dalam kelompok keluarga yang dipimpin oleh pejantan punggung perak (Silverback) yang protektif." },
      { name: "Anjing Laut", aliases: ["seal", "singa laut"], score: 58, fact: "Dapat menahan napas hingga lebih dari 1 jam saat menyelam mencari ikan di bawah lapisan es." },
      { name: "Berang-berang", aliases: ["berang berang", "otter", "beaver"], score: 62, fact: "Berang-berang laut tidur sambil berpegangan tangan di permukaan air agar tidak hanyut terpisah oleh arus!" },

      // ABISAL
      { name: "Orca", aliases: ["paus pembunuh", "killer whale"], score: 68, fact: "Meskipun sering disebut 'Paus Pembunuh', Orca sebenarnya adalah spesies terbesar dalam keluarga Lumba-lumba!" },
      { name: "Dugong", aliases: ["duyung", "ikan duyung", "manatee"], score: 72, fact: "Mamalia laut pemakan lamun (rumput laut) yang secara evolusi merupakan kerabat dekat dari Gajah!" },
      { name: "Tapir", aliases: ["tapir asia"], score: 74, fact: "Dijuluki 'fosil hidup' karena bentuk tubuhnya hampir tidak berubah selama puluhan juta tahun; hidungnya bisa digunakan sebagai snorkel." },
      { name: "Trenggiling", aliases: ["pangolin"], score: 76, fact: "Satu-satunya mamalia di dunia yang seluruh tubuhnya ditutupi oleh sisik keras dari keratin." },
      { name: "Kukang", aliases: ["slow loris"], score: 78, fact: "Salah satu dari sangat sedikit mamalia di dunia yang memiliki gigitan berbisa (racunnya diambil dari kelenjar di lengannya)." },
      { name: "Kuskus", aliases: ["kuskus beruang"], score: 80, fact: "Mamalia berkantung (marsupial) arboreal yang hidup di wilayah Sulawesi, Maluku, dan Papua." },
      { name: "Anoa", aliases: [], score: 82, fact: "Kerbau kerdil endemik Sulawesi yang merupakan mamalia darat bertanduk terkecil dari keluarga sapi liar." },
      { name: "Babirusa", aliases: ["babi rusa"], score: 84, fact: "Mamalia endemik Sulawesi yang taring atasnya tumbuh menembus moncong dan melengkung ke arah dahi!" },
      { name: "Alpaka", aliases: ["alpaca", "llama"], score: 75, fact: "Mamalia pegunungan Andes yang menghasilkan serat wol sangat lembut dan hipoalergenik." },
      { name: "Kapibara", aliases: ["capybara", "masbro"], score: 70, fact: "Hewan pengerat (rodentia) terbesar di dunia yang sangat ramah hingga burung dan hewan lain suka duduk di punggungnya." },
      { name: "Kungkang", aliases: ["sloth"], score: 77, fact: "Bergerak sangat lambat hingga alga hijau tumbuh di bulunya, yang justru membantunya berkamuflase di pepohonan!" },
      { name: "Armadillo", aliases: ["armadilo"], score: 81, fact: "Mamalia bercangkang lempeng tulang dari benua Amerika yang dapat menggulung diri menjadi bola sempurna." },
      { name: "Walrus", aliases: ["beruang laut"], score: 83, fact: "Menggunakan gading panjangnya untuk menarik tubuhnya yang seberat 1,5 ton naik ke atas bongkahan es." },
      { name: "Binturong", aliases: ["binturung", "bearcat"], score: 88, fact: "Mamalia hutan Asia Tenggara yang kelenjar aromanya mengeluarkan bau persis seperti popcorn mentega hangat!" },

      // LEGENDA PALUNG
      { name: "Platipus", aliases: ["platypus", "ornithorhynchus"], score: 92, fact: "Mamalia berparuh bebek dari Australia yang bertelur (monotremata) dan mampu mendeteksi medan listrik mangsanya di dalam air!" },
      { name: "Ekidna", aliases: ["echidna", "babi duri"], score: 95, fact: "Bersama Platipus, Ekidna adalah satu-satunya mamalia yang berkembang biak dengan cara bertelur; hidup juga di Papua!" },
      { name: "Pesut Mahakam", aliases: ["pesut"], score: 96, fact: "Lumba-lumba air tawar langka kebanggaan Kalimantan Timur yang bernavigasi di sungai keruh menggunakan ekolokasi." },
      { name: "Narwhal", aliases: ["paus bertanduk"], score: 97, fact: "'Tanduk' spiral sepanjang 3 meter pada kepala Narwhal sebenarnya adalah gigi taring kiri yang tumbuh menembus bibir!" },
      { name: "Okapi", aliases: [], score: 98, fact: "Memiliki kaki belang seperti zebra tetapi sebenarnya adalah satu-satunya kerabat dekat Jerapah yang masih hidup di hutan Kongo." },
      { name: "Tarsius", aliases: ["krabuku"], score: 94, fact: "Primata mungil dari Sulawesi yang ukuran satu bola matanya lebih besar daripada ukuran otaknya sendiri!" },
      { name: "Quokka", aliases: ["wombat", "tasmanian devil"], score: 99, fact: "Marsupial kecil dari Australia Barat yang dijuluki 'hewan paling bahagia di dunia' karena struktur wajahnya selalu tampak tersenyum." }
    ]
  },

  {
    id: "bahasa-pemrograman",
    title: "Sebutkan Bahasa Pemrograman Komputer",
    theme: "umum",
    hint: "Bahasa untuk membuat aplikasi, web, game, data science, hingga sistem operasi!",
    educationalNote: "Bahasa pemrograman pertama di dunia ditulis oleh Ada Lovelace pada tahun 1843 untuk mesin analitik Charles Babbage.",
    answers: [
      // PLANKTON
      { name: "Python", aliases: ["py"], score: 12, fact: "Dinamai bukan dari ular piton, melainkan dari grup komedi Inggris favorit pembuatnya (Guido van Rossum), 'Monty Python'!" },
      { name: "JavaScript", aliases: ["js", "ecmascript"], score: 14, fact: "Diciptakan oleh Brendan Eich hanya dalam waktu 10 hari pada tahun 1995 dan kini menghidupkan hampir seluruh website di dunia." },
      { name: "Java", aliases: [], score: 16, fact: "Awalnya bernama 'Oak', lalu diganti menjadi 'Java' karena para pembuatnya sangat suka minum kopi asal Pulau Jawa!" },
      { name: "C++", aliases: ["cpp", "c plus plus"], score: 18, fact: "Tulang punggung dari hampir semua game AAA modern dan mesin game seperti Unreal Engine." },
      { name: "C", aliases: ["bahasa c"], score: 20, fact: "Diciptakan oleh Dennis Ritchie pada tahun 1972 untuk membangun sistem operasi UNIX dan masih menggerakkan kernel Linux hingga kini." },
      { name: "PHP", aliases: [], score: 22, fact: "Awalnya singkatan dari 'Personal Home Page', kini menjadi 'PHP: Hypertext Preprocessor' yang menggerakkan WordPress." },
      { name: "C#", aliases: ["c sharp", "csharp"], score: 25, fact: "Simbol '#' berasal dari tanda kres musik (Sharp) sekaligus gabungan empat tanda tambah (++ di atas ++)." },
      { name: "TypeScript", aliases: ["ts"], score: 28, fact: "Dikembangkan oleh Anders Hejlsberg (pencipta C# dan Turbo Pascal) untuk menambahkan sistem tipe statis pada JavaScript." },

      // KARANG
      { name: "Go", aliases: ["golang"], score: 38, fact: "Dirancang di Google oleh legenda komputer Ken Thompson dan Rob Pike; maskotnya adalah tupai biru lucu bernama Gopher." },
      { name: "Rust", aliases: [], score: 40, fact: "Dipilih sebagai bahasa pemrograman paling dicintai developer di survei Stack Overflow selama 8 tahun berturut-turut!" },
      { name: "Swift", aliases: [], score: 42, fact: "Diperkenalkan Apple pada tahun 2014 untuk menggantikan Objective-C dalam pembuatan aplikasi iOS dan macOS." },
      { name: "Kotlin", aliases: [], score: 44, fact: "Dinamai dari Pulau Kotlin di dekat St. Petersburg, sama seperti Java yang dinamai dari Pulau Jawa!" },
      { name: "Ruby", aliases: [], score: 46, fact: "Diciptakan oleh Yukihiro 'Matz' Matsumoto di Jepang dengan filosofi utama 'membuat programmer bahagia'." },
      { name: "Dart", aliases: [], score: 48, fact: "Bahasa di balik framework Flutter yang memungkinkan satu kode berjalan di Android, iOS, Web, dan Desktop." },
      { name: "SQL", aliases: ["pl/sql", "tsql"], score: 36, fact: "Bahasa standar untuk mengelola basis data relasional yang pertama kali dikembangkan di IBM pada tahun 1970-an." },
      { name: "R", aliases: ["bahasa r"], score: 52, fact: "Bahasa favorit ilmuwan statistik dan bioinformatika, dinamai dari inisial dua pembuatnya: Ross Ihaka dan Robert Gentleman." },
      { name: "Pascal", aliases: ["turbo pascal", "delphi"], score: 55, fact: "Dirancang oleh Niklaus Wirth pada tahun 1970 untuk mengajarkan pemrograman terstruktur yang rapi kepada mahasiswa." },
      { name: "Scratch", aliases: [], score: 56, fact: "Bahasa pemrograman visual berbasis blok dari MIT Media Lab yang telah mengenalkan jutaan anak pada logika coding." },
      { name: "Lua", aliases: [], score: 58, fact: "Artinya 'Bulan' dalam bahasa Portugis; bahasa ringan asal Brasil yang digunakan untuk membuat game di Roblox dan mod World of Warcraft!" },
      { name: "MATLAB", aliases: [], score: 60, fact: "Singkatan dari 'Matrix Laboratory', sangat populer di kalangan insinyur untuk simulasi matematika dan pemrosesan sinyal." },
      { name: "Perl", aliases: [], score: 64, fact: "Julukannya adalah 'Pisau Lipat Swiss untuk Internet' pada tahun 1990-an karena kehebatannya memproses teks." },

      // ABISAL
      { name: "Assembly", aliases: ["asm", "assembler"], score: 68, fact: "Bahasa tingkat rendah yang berbicara hampir langsung ke instruksi prosesor; game RollerCoaster Tycoon ditulis 99% dengan Assembly!" },
      { name: "Scala", aliases: [], score: 72, fact: "Singkatan dari 'Scalable Language', menggabungkan pemrograman berorientasi objek dan fungsional di atas JVM." },
      { name: "Haskell", aliases: [], score: 75, fact: "Bahasa pemrograman fungsional murni yang dinamai dari ahli logika matematika Haskell Curry." },
      { name: "Elixir", aliases: [], score: 77, fact: "Berjalan di atas mesin virtual Erlang (BEAM) yang mampu menangani jutaan koneksi chat secara bersamaan tanpa henti." },
      { name: "Erlang", aliases: [], score: 80, fact: "Dibuat oleh Ericsson untuk jaringan telekomunikasi dengan reabilitas mencapai 99,9999999% (sembilan angka sembilan!)." },
      { name: "COBOL", aliases: [], score: 78, fact: "Berusia lebih dari 60 tahun (dibuat tahun 1959, dipelopori Grace Hopper) tetapi masih memproses sebagian besar transaksi ATM dan perbankan dunia!" },
      { name: "Fortran", aliases: [], score: 79, fact: "Bahasa pemrograman tingkat tinggi komersial pertama di dunia (1957), masih dipakai untuk prakiraan cuaca superkomputer." },
      { name: "Objective-C", aliases: ["objc", "objective c"], score: 74, fact: "Bahasa utama sistem operasi NeXTSTEP milik Steve Jobs yang menjadi fondasi macOS dan iOS modern." },
      { name: "Visual Basic", aliases: ["vb", "vba", "basic"], score: 70, fact: "BASIC diciptakan tahun 1964 agar mahasiswa non-sains pun bisa menggunakan komputer; VBA masih mengotomasi Excel di seluruh dunia." },
      { name: "Solidity", aliases: [], score: 82, fact: "Bahasa pemrograman khusus untuk menulis Smart Contract di jaringan blockchain seperti Ethereum." },
      { name: "Julia", aliases: [], score: 84, fact: "Dirancang untuk komputasi sains tingkat tinggi: semudah membaca Python, namun secepat bahasa C!" },
      { name: "Clojure", aliases: [], score: 86, fact: "Dialek modern dari bahasa Lisp yang berjalan di atas Java Virtual Machine." },
      { name: "Zig", aliases: [], score: 88, fact: "Bahasa sistem modern yang dirancang sebagai penerus bahasa C yang lebih aman dan transparan tanpa alokasi memori tersembunyi." },

      // LEGENDA PALUNG
      { name: "Lisp", aliases: ["common lisp", "scheme"], score: 91, fact: "Bahasa pemrograman tertua kedua (1958) yang menjadi pelopor riset Kecerdasan Buatan (AI) dan fitur Garbage Collection." },
      { name: "Prolog", aliases: [], score: 93, fact: "Bahasa pemrograman berbasis logika deklaratif yang digunakan oleh sistem AI IBM Watson saat memenangkan kuis Jeopardy!" },
      { name: "Ada", aliases: [], score: 95, fact: "Dinamai untuk menghormati Ada Lovelace; digunakan pada perangkat lunak kritis seperti sistem kendali pesawat terbang, roket, dan satelit." },
      { name: "OCaml", aliases: ["f#", "fsharp"], score: 96, fact: "Sangat disukai di industri perdagangan finansial berkecepatan tinggi dan pembuatan kompiler karena ketepatan sistem tipenya." },
      { name: "Smalltalk", aliases: [], score: 97, fact: "Pelopor pemrograman berorientasi objek (OOP) dan antarmuka jendela grafis (GUI) di laboratorium Xerox PARC tahun 1970-an." },
      { name: "APL", aliases: ["forth", "nim", "crystal"], score: 99, fact: "Menggunakan simbol matematika khusus sehingga operasi matriks kompleks bisa ditulis hanya dalam satu baris simbol pendek!" }
    ]
  },

  {
    id: "gunung-indonesia",
    title: "Sebutkan Gunung di Indonesia",
    theme: "nusantara",
    hint: "Indonesia berada di Cincin Api Pasifik dengan ratusan gunung berapi dan puncak megah dari Sumatera hingga Papua!",
    educationalNote: "Indonesia memiliki sekitar 127 gunung berapi aktif—jumlah terbanyak di dunia—yang membuat tanah vulkanik Nusantara sangat subur.",
    answers: [
      // PLANKTON
      { name: "Gunung Bromo", aliases: ["bromo"], score: 12, fact: "Berada di dalam kaldera purba Tengger yang luas dan dikelilingi Lautan Pasir vulkanik." },
      { name: "Gunung Semeru", aliases: ["semeru", "mahameru"], score: 14, fact: "Gunung tertinggi di Pulau Jawa dengan ketinggian 3.676 meter di atas permukaan laut." },
      { name: "Gunung Merapi", aliases: ["merapi"], score: 15, fact: "Salah satu gunung berapi paling aktif di dunia yang telah dipantau secara ilmiah sejak awal abad ke-20." },
      { name: "Gunung Rinjani", aliases: ["rinjani"], score: 18, fact: "Memiliki danau kawah Segara Anak yang indah dengan anak gunung berapi baru (Gunung Barujari) di tengah danaunya!" },
      { name: "Gunung Krakatau", aliases: ["krakatau", "anak krakatau"], score: 20, fact: "Letusan Krakatau tahun 1883 menghasilkan suara paling keras dalam sejarah manusia modern, terdengar hingga sejauh 4.800 km!" },
      { name: "Gunung Jayawijaya", aliases: ["jayawijaya", "puncak jaya", "carstensz", "carstensz pyramid"], score: 22, fact: "Puncak tertinggi di Indonesia (4.884 mdpl) dan salah satu dari Seven Summits dunia yang memiliki gletser tropis!" },
      { name: "Gunung Agung", aliases: ["agung"], score: 25, fact: "Titik tertinggi dan paling disucikan di Pulau Bali dengan ketinggian 3.031 mdpl." },
      { name: "Gunung Merbabu", aliases: ["merbabu"], score: 27, fact: "Terkenal dengan padang sabana hijau yang luas dan pemandangan langsung menghadap puncak Gunung Merapi." },
      { name: "Gunung Salak", aliases: ["salak"], score: 28, fact: "Namanya tidak berasal dari buah salak, melainkan dari kata Sanskerta 'Salaka' yang berarti Perak!" },
      { name: "Gunung Tangkuban Perahu", aliases: ["tangkuban perahu", "tangkuban parahu"], score: 26, fact: "Bentuknya menyerupai perahu terbalik yang dikaitkan dengan legenda rakyat Sunda, Sangkuriang." },

      // KARANG
      { name: "Gunung Kerinci", aliases: ["kerinci"], score: 38, fact: "Gunung berapi tertinggi di Indonesia (3.805 mdpl) dan puncak tertinggi di Pulau Sumatera!" },
      { name: "Gunung Tambora", aliases: ["tambora"], score: 42, fact: "Letusan Tambora di Sumbawa tahun 1815 adalah letusan terbesar dalam sejarah tercatat, menyebabkan 'Tahun Tanpa Musim Panas' di Eropa!" },
      { name: "Gunung Ijen", aliases: ["kawah ijen", "ijen"], score: 44, fact: "Salah satu dari hanya dua tempat di dunia yang memiliki fenomena 'Blue Fire' (Api Biru) alami di kawah belerangnya." },
      { name: "Gunung Prau", aliases: ["prau"], score: 45, fact: "Terletak di Dataran Tinggi Dieng dan terkenal dengan bukit Teletubbies serta pemandangan Golden Sunrise." },
      { name: "Gunung Sindoro", aliases: ["sindoro", "sundoro"], score: 47, fact: "Berdiri berdampingan dengan Gunung Sumbing sehingga dijuluki sebagai 'Gunung Kembar' Jawa Tengah." },
      { name: "Gunung Sumbing", aliases: ["sumbing"], score: 48, fact: "Gunung tertinggi ketiga di Pulau Jawa setelah Semeru dan Slamet." },
      { name: "Gunung Slamet", aliases: ["slamet"], score: 46, fact: "Gunung tertinggi di Jawa Tengah (3.432 mdpl) dan gunung tunggal dengan diameter kaki gunung terluas di Jawa." },
      { name: "Gunung Lawu", aliases: ["lawu"], score: 49, fact: "Berada tepat di perbatasan Jawa Tengah dan Jawa Timur, terkenal dengan populasi burung Jalak Lawu yang ramah kepada pendaki." },
      { name: "Gunung Gede", aliases: ["gede", "gunung gede pangrango", "pangrango"], score: 45, fact: "Memiliki Alun-Alun Suryakencana, padang bunga Edelweis Jawa (Anaphalis javanica) seluas 50 hektare." },
      { name: "Gunung Ciremai", aliases: ["ciremai", "ceremai"], score: 52, fact: "Gunung tertinggi di Provinsi Jawa Barat dengan ketinggian 3.078 mdpl." },
      { name: "Gunung Papandayan", aliases: ["papandayan"], score: 54, fact: "Gunung di Garut yang terkenal dengan Hutan Mati eksotis dan kawah belerang aktif yang mudah dijangkau." },
      { name: "Gunung Batur", aliases: ["batur"], score: 55, fact: "Ditetapkan sebagai Global Geopark pertama di Indonesia oleh UNESCO karena memiliki kaldera ganda yang menakjubkan." },
      { name: "Gunung Sinabung", aliases: ["sinabung"], score: 56, fact: "Gunung di Sumatera Utara yang tertidur selama 400 tahun sebelum kembali aktif pada tahun 2010." },
      { name: "Gunung Kelud", aliases: ["kelud"], score: 58, fact: "Sejak tahun 1907 telah dibangun sistem terowongan drainase di dalam gunung untuk mengurangi volume air danau kawahnya!" },
      { name: "Gunung Arjuno", aliases: ["arjuno", "welirang"], score: 62, fact: "Bersebelahan dengan Gunung Welirang yang kawah belerangnya masih ditambang secara tradisional sejak zaman kuno." },

      // ABISAL
      { name: "Gunung Latimojong", aliases: ["latimojong", "rantemario"], score: 70, fact: "Puncak Rantemario di Pegunungan Latimojong adalah titik tertinggi di seluruh Pulau Sulawesi (3.478 mdpl)!" },
      { name: "Gunung Bukit Raya", aliases: ["bukit raya"], score: 78, fact: "Gunung tertinggi di wilayah Kalimantan Indonesia (2.278 mdpl) yang bukan merupakan gunung berapi." },
      { name: "Gunung Binaiya", aliases: ["binaiya"], score: 80, fact: "Puncak tertinggi di Kepulauan Maluku (Pulau Seram, 3.027 mdpl); pendakiannya dimulai langsung dari titik 0 meter di tepi pantai!" },
      { name: "Gunung Kelimutu", aliases: ["kelimutu"], score: 72, fact: "Gunung di Pulau Flores yang memiliki tiga danau kawah (Tiwu Ata Mbupu, Tiwu Nuwa Muri Koo Fai, Tiwu Ata Polo) yang warnanya bisa berubah-ubah!" },
      { name: "Gunung Raung", aliases: ["raung"], score: 74, fact: "Memiliki kaldera kering terbesar di Pulau Jawa dengan jalur puncak 'Sejati' yang sangat menantang." },
      { name: "Gunung Argopuro", aliases: ["argopuro"], score: 76, fact: "Memiliki jalur pendakian terpanjang di Pulau Jawa (lebih dari 40 km) dengan padang sabana Cikasur yang dihuni burung merak liar!" },
      { name: "Gunung Marapi", aliases: ["marapi"], score: 73, fact: "Gunung paling aktif di Sumatera Barat yang dalam tambo Minangkabau dipercaya sebagai tempat pertama nenek moyang bermukim." },
      { name: "Gunung Singgalang", aliases: ["singgalang"], score: 77, fact: "Memiliki Telaga Dewi di puncaknya yang merupakan bekas kawah purba yang kini dipenuhi lumut dan hutan lembap." },
      { name: "Gunung Dempo", aliases: ["dempo"], score: 79, fact: "Gunung tertinggi di Sumatera Selatan (Pagar Alam) yang kaki gunungnya dikelilingi hamparan kebun teh hijau." },
      { name: "Gunung Lokon", aliases: ["lokon", "soputan", "klabat"], score: 84, fact: "Gunung berapi aktif di Sulawesi Utara yang kawahnya (Kawah Tompaluan) tidak berada di puncak, melainkan di pelana gunung!" },
      { name: "Gunung Gamalama", aliases: ["gamalama"], score: 85, fact: "Membentuk keseluruhan Pulau Ternate di Maluku Utara dan telah menjadi penanda jalur perdagangan cengkeh dunia selama berabad-abad." },

      // LEGENDA PALUNG
      { name: "Gunung Leuser", aliases: ["leuser"], score: 90, fact: "Ekosistem Leuser di Aceh adalah satu-satunya tempat di Bumi di mana Harimau, Gajah, Badak, dan Orangutan masih hidup berdampingan di alam liar!" },
      { name: "Gunung Trikora", aliases: ["trikora", "puncak trikora", "puncak mandala"], score: 94, fact: "Salah satu puncak tertinggi di Pegunungan Tengah Papua dengan ketinggian 4.750 meter di atas permukaan laut." },
      { name: "Gunung Halimun", aliases: ["halimun", "burangrang", "cikuray", "guntur"], score: 91, fact: "Taman Nasional Gunung Halimun Salak menyimpan hutan hujan pegunungan terluas yang tersisa di Jawa Barat." },
      { name: "Gunung Rokatenda", aliases: ["rokatenda", "lewotobi", "ile ape", "egon"], score: 96, fact: "Gunung berapi di Pulau Palue, Nusa Tenggara Timur yang menjulang langsung dari dasar Laut Flores." },
      { name: "Gunung Karangetang", aliases: ["karangetang", "awu", "ibu", "ducono", "dukono"], score: 98, fact: "Salah satu gunung berapi paling aktif di Indonesia yang berada di Pulau Siau, Kepulauan Sangihe, Sulawesi Utara." }
    ]
  },

  {
    id: "organ-tubuh",
    title: "Sebutkan Organ atau Bagian Dalam Tubuh Manusia",
    theme: "sains",
    hint: "Organ vital, kelenjar, bagian sistem pencernaan, pernapasan, hingga peredaran darah!",
    educationalNote: "Tubuh manusia dewasa memiliki sekitar 78 organ yang bekerja tanpa henti selama 24 jam sehari.",
    answers: [
      // PLANKTON
      { name: "Jantung", aliases: ["heart"], score: 12, fact: "Berdetak sekitar 100.000 kali setiap hari dan memompa sekitar 7.500 liter darah melewati pembuluh darah!" },
      { name: "Otak", aliases: ["brain", "otak besar", "otak kecil"], score: 13, fact: "Mengandung sekitar 86 miliar sel saraf (neuron) dan menghasilkan daya listrik yang cukup untuk menyalakan bola lampu LED kecil." },
      { name: "Paru-paru", aliases: ["paru paru", "paru", "lungs"], score: 15, fact: "Jika seluruh kantung udara (alveolus) di dalam paru-paru manusia dibentangkan, luasnya setara dengan satu lapangan tenis!" },
      { name: "Hati", aliases: ["liver", "hepar"], score: 18, fact: "Satu-satunya organ dalam tubuh manusia yang mampu beregenerasi kembali ke ukuran penuh meskipun tersisa hanya 25%!" },
      { name: "Ginjal", aliases: ["kidney"], score: 20, fact: "Menyaring seluruh darah di dalam tubuh kita sekitar 40 kali setiap harinya!" },
      { name: "Lambung", aliases: ["perut", "stomach"], score: 22, fact: "Asam lambung (HCl) sangat kuat hingga bisa melarutkan logam tipis, sehingga lapisan dinding lambung memperbarui dirinya setiap 3-4 hari." },
      { name: "Usus", aliases: ["usus halus", "usus besar", "intestine"], score: 24, fact: "Panjang total usus halus manusia dewasa mencapai 6 hingga 7 meter!" },
      { name: "Mata", aliases: ["bola mata", "retina", "kornea"], score: 26, fact: "Otot yang menggerakkan bola mata adalah otot paling aktif di seluruh tubuh manusia, bergerak lebih dari 100.000 kali sehari." },
      { name: "Kulit", aliases: ["skin", "epidermis"], score: 28, fact: "Organ terbesar pada tubuh manusia dengan berat sekitar 15% dari total berat badan kita!" },
      { name: "Tulang", aliases: ["rangka", "sumsum tulang"], score: 30, fact: "Bayi lahir dengan sekitar 300 tulang, namun sebagian menyatu saat tumbuh sehingga orang dewasa memiliki 206 tulang." },

      // KARANG
      { name: "Pankreas", aliases: ["pancreas"], score: 40, fact: "Memiliki fungsi ganda: menghasilkan enzim pencernaan sekaligus hormon insulin untuk mengatur gula darah." },
      { name: "Limpa", aliases: ["spleen"], score: 48, fact: "Berperan sebagai penyaring darah raksasa yang mendaur ulang sel darah merah tua dan menyimpan cadangan sel darah putih." },
      { name: "Empedu", aliases: ["kantung empedu", "kandung empedu", "gallbladder"], score: 46, fact: "Menyimpan cairan empedu dari hati yang berfungsi memecah lemak makanan seperti deterjen alami." },
      { name: "Usus Buntu", aliases: ["apendiks", "appendix"], score: 45, fact: "Kini diketahui bukan organ sia-sia! Usus buntu berfungsi sebagai 'rumah aman' bagi bakteri baik usus saat kita terkena diare." },
      { name: "Kerongkongan", aliases: ["esofagus", "esophagus"], score: 47, fact: "Menggunakan gerakan gelombang otot (peristaltik) yang begitu kuat sehingga kita tetap bisa menelan air meskipun sedang berdiri terbalik!" },
      { name: "Tenggorokan", aliases: ["faring", "laring", "trakea", "batang tenggorokan"], score: 44, fact: "Di dalamnya terdapat pita suara dan katup epiglotis yang otomatis menutup saluran napas setiap kali kita menelan makanan." },
      { name: "Kandung Kemih", aliases: ["kantong kemih", "vesika urinaria"], score: 52, fact: "Dinding ototnya sangat elastis dan dapat menampung sekitar 400 hingga 600 mililiter cairan." },
      { name: "Rahim", aliases: ["uterus"], score: 50, fact: "Organ berotot luar biasa yang dapat mengembang hingga ratusan kali lipat ukurannya selama masa kehamilan." },
      { name: "Lidah", aliases: ["tongue"], score: 38, fact: "Setiap manusia memiliki cetakan permukaan lidah yang unik, sama seperti sidik jari!" },
      { name: "Diafragma", aliases: ["otot diafragma"], score: 58, fact: "Otot berbentuk kubah di bawah paru-paru; ketika otot ini berkontraksi secara tiba-tiba tanpa sengaja, terjadilah cegukan!" },
      { name: "Pembuluh Darah", aliases: ["arteri", "vena", "kapiler", "aorta"], score: 55, fact: "Jika seluruh pembuluh darah dalam satu tubuh manusia disambung memanjang, panjangnya mencapai 100.000 km (2,5 kali keliling Bumi!)." },
      { name: "Amandel", aliases: ["tonsil"], score: 56, fact: "Garda pertahanan pertama sistem kekebalan tubuh terhadap bakteri dan virus yang masuk lewat mulut atau hidung." },

      // ABISAL
      { name: "Kelenjar Tiroid", aliases: ["tiroid", "kelenjar gondok"], score: 68, fact: "Kelenjar berbentuk kupu-kupu di leher yang mengatur kecepatan metabolisme dan penggunaan energi seluruh sel tubuh." },
      { name: "Kelenjar Adrenal", aliases: ["adrenal", "anak ginjal"], score: 74, fact: "Terletak tepat di atas ginjal dan memproduksi hormon Adrenalin saat kita menghadapi situasi darurat atau tegang!" },
      { name: "Hipotalamus", aliases: ["hypothalamus"], score: 78, fact: "Bagian otak seukuran kacang almond yang bertindak sebagai 'termostat pintar' pengatur suhu tubuh, rasa lapar, dan haus." },
      { name: "Hipokampus", aliases: ["hippocampus"], score: 82, fact: "Pusat memori di dalam otak yang bentuknya menyerupai kuda laut (Hippocampus dalam bahasa Yunani berarti kuda laut!)." },
      { name: "Amigdala", aliases: ["amygdala"], score: 84, fact: "Bagian otak yang memproses emosi rasa takut, kewaspadaan, dan memori emosional." },
      { name: "Kelenjar Pituitari", aliases: ["pituitari", "hipofisis"], score: 85, fact: "Dijuluki 'Master Gland' karena meskipun hanya seukuran kacang polong, hormonnya mengendalikan hampir seluruh kelenjar lain di tubuh." },
      { name: "Timus", aliases: ["kelenjar timus", "thymus"], score: 86, fact: "Tempat 'sekolah pelatihan' bagi Sel-T sistem imun kita; uniknya, organ ini besar saat kita anak-anak dan menyusut saat dewasa!" },
      { name: "Duodenum", aliases: ["usus dua belas jari", "jejunum", "ileum"], score: 76, fact: "Dinamai 'usus dua belas jari' karena panjang bagian pertama usus halus ini kurang lebih selebar 12 jari tangan yang dijejerkan." },
      { name: "Koklea", aliases: ["rumah siput", "gendang telinga"], score: 80, fact: "Organ berbentuk cangkang siput di telinga bagian dalam yang mengubah getaran suara menjadi sinyal listrik menuju otak." },

      // LEGENDA PALUNG
      { name: "Kelenjar Pineal", aliases: ["pineal", "epifisis"], score: 92, fact: "Organ mungil di tengah otak yang menghasilkan hormon Melatonin untuk mengatur jam biologis tidur dan bangun kita." },
      { name: "Epiglotis", aliases: ["katup napas"], score: 94, fact: "Katup tulang rawan elastis yang menjaga agar makanan masuk ke kerongkongan dan bukan ke paru-paru." },
      { name: "Mesenterium", aliases: ["mesentery"], score: 97, fact: "Jaringan berlipat yang mengikat usus ke dinding perut; baru diklasifikasikan secara resmi sebagai organ tersendiri oleh ilmuwan pada tahun 2016!" },
      { name: "Medula Oblongata", aliases: ["batang otak", "pons"], score: 95, fact: "Pusat kendali otomatis di pangkal otak yang menjaga kita tetap bernapas dan jantung tetap berdetak bahkan saat kita tidur lelap." },
      { name: "Pulau Langerhans", aliases: ["langerhans", "kelenjar paratiroid", "paratiroid"], score: 98, fact: "Kelompok sel mikroskopis di dalam pankreas yang memproduksi insulin, ditemukan oleh Paul Langerhans pada tahun 1869." }
    ]
  },

  {
    id: "alat-musik-tradisional",
    title: "Sebutkan Alat Musik Tradisional Indonesia",
    theme: "nusantara",
    hint: "Dari alat musik pukul, petik, tiup, hingga gesek warisan budaya berbagai suku di Indonesia!",
    educationalNote: "Banyak alat musik tradisional Indonesia seperti Angklung dan Gamelan telah diakui sebagai Warisan Budaya Takbenda Dunia oleh UNESCO.",
    answers: [
      // PLANKTON
      { name: "Angklung", aliases: [], score: 12, fact: "Alat musik bambu dari Jawa Barat yang diakui UNESCO pada tahun 2010; setiap satu angklung menghasilkan satu nada spesifik." },
      { name: "Gamelan", aliases: ["bonang", "saron", "kenong"], score: 14, fact: "Rekaman musik Gamelan Jawa dikirim ke luar angkasa oleh NASA di dalam piringan emas wahana Voyager tahun 1977!" },
      { name: "Gendang", aliases: ["kendang", "gendang sunda", "kendang jawa"], score: 16, fact: "Berfungsi sebagai pemimpin tempo (konduktor) dalam ansambel gamelan maupun musik tari tradisional." },
      { name: "Suling", aliases: ["seruling", "saluang"], score: 18, fact: "Alat musik tiup berbahan bambu yang ditemukan hampir di seluruh daerah Nusantara dengan tangga nada khas masing-masing." },
      { name: "Gong", aliases: ["gong ageng"], score: 20, fact: "Melambangkan siklus waktu dan keseimbangan kosmos; dentumannya menandai awal dan akhir satu siklus gending." },
      { name: "Sasando", aliases: [], score: 24, fact: "Alat musik petik dari Pulau Rote, NTT yang tabung resonatornya terbuat dari anyaman daun lontar!" },
      { name: "Tifa", aliases: [], score: 25, fact: "Alat musik pukul khas Maluku dan Papua yang dipahat dari sebatang kayu utuh dan dihiasi ukiran khas suku setempat." },
      { name: "Kolintang", aliases: ["kulintang"], score: 28, fact: "Alat musik perkusi kayu khas Minahasa, Sulawesi Utara yang namanya berasal dari bunyi nadanya: Tong (rendah), Ting (tinggi), Tang (tengah)!" },

      // KARANG
      { name: "Kecapi", aliases: ["kacapi"], score: 38, fact: "Alat musik petik utama dalam kesenian Tembang Sunda Cianjuran yang dibuat dari kayu pohon sentul." },
      { name: "Rebab", aliases: [], score: 42, fact: "Alat musik gesek berdawai dua yang masuk ke Nusantara melalui jalur perdagangan budaya Timur Tengah berabad-abad silam." },
      { name: "Calung", aliases: [], score: 46, fact: "Purwarupa dari angklung yang cara memainkannya bukan digoyangkan, melainkan dipukul bilah bambunya." },
      { name: "Talempong", aliases: [], score: 48, fact: "Alat musik pukul berbahan kuningan atau perunggu khas Minangkabau, Sumatera Barat." },
      { name: "Sampek", aliases: ["sape", "sapek"], score: 52, fact: "Alat musik petik tradisional Suku Dayak di Kalimantan yang nadanya sangat menenangkan seperti suara alam hutan hujan." },
      { name: "Gordang Sambilan", aliases: ["gordang"], score: 56, fact: "Sembilan gendang raksasa khas suku Mandailing di Sumatera Utara yang dulunya dimainkan dalam ritual memanggil hujan." },
      { name: "Tanjidor", aliases: [], score: 54, fact: "Ansambel musik tiup khas Betawi hasil akulturasi budaya lokal dengan instrumen baris-berbaris Eropa abad ke-19." },
      { name: "Gambus", aliases: [], score: 55, fact: "Alat musik petik mirip mandolin yang menggunakan senar nilon atau usus hewan, sangat populer dalam kesenian Melayu." },
      { name: "Rebana", aliases: ["kompang", "hadroh", "marawis"], score: 45, fact: "Gendang bingkai bundar yang menjadi pengiring syair dan musik religi di berbagai pesisir Nusantara." },
      { name: "Karinding", aliases: [], score: 62, fact: "Alat musik getar bambu mungil khas Sunda yang dimainkan dengan menempelkannya di depan rongga mulut sebagai resonator!" },

      // ABISAL
      { name: "Saluang", aliases: ["bansi"], score: 68, fact: "Pemain Saluang Minangkabau menguasai teknik 'Manyisiahkan Angok' (pernapasan sirkular) sehingga bisa meniup tanpa putus selama puluhan menit!" },
      { name: "Tehyan", aliases: ["kongahyan", "sukong"], score: 74, fact: "Alat musik gesek khas Betawi peranakan yang tabung resonansinya terbuat dari tempurung kelapa!" },
      { name: "Aramba", aliases: ["faritia"], score: 78, fact: "Alat musik pukul berbentuk gong kecil khas Pulau Nias, Sumatera Utara." },
      { name: "Ceng-ceng", aliases: ["ceng ceng", "rincik"], score: 76, fact: "Simbal perunggu khas gamelan Bali yang menghasilkan ritme cepat dan dinamis." },
      { name: "Rindik", aliases: ["grantang"], score: 77, fact: "Alat musik bilah bambu khas Bali yang suaranya selalu menyambut wisatawan dengan suasana damai." },
      { name: "Gambang", aliases: ["gambang kromong"], score: 70, fact: "Alat musik pukul berbilah kayu jati atau suar sebanyak 18–20 bilah dalam perangkat gamelan dan Gambang Kromong." },
      { name: "Siter", aliases: ["celempung"], score: 80, fact: "Alat musik petik di dalam perangkat gamelan Jawa yang senarnya dipetik menggunakan kedua ibu jari." },
      { name: "Serunai", aliases: ["sarune", "serune kalee"], score: 82, fact: "Alat musik tiup tradisional di Aceh, Minangkabau, dan Batak yang menggunakan lidah tiup ganda (double reed)." },
      { name: "Gender", aliases: ["slenthem"], score: 84, fact: "Instrumen gamelan berbilah logam tipis yang digantung di atas tabung-tabung bambu penala suara." },

      // LEGENDA PALUNG
      { name: "Triton", aliases: ["tahuri", "fu"], score: 92, fact: "Alat musik tiup dari cangkang kerang laut besar khas pesisir Maluku dan Papua yang suaranya menggema melintasi lautan!" },
      { name: "PantIng", aliases: ["panting"], score: 94, fact: "Alat musik petik khas suku Banjar di Kalimantan Selatan yang bentuknya menyerupai gambus kecil." },
      { name: "Bundengan", aliases: [], score: 96, fact: "Alat musik langka dari Wonosobo yang awalnya merupakan tudung pelindung hujan penggembala bebek, namun diberi dawai hingga bersuara seperti gamelan dan kendang sekaligus!" },
      { name: "Guoto", aliases: ["pikon"], score: 98, fact: "Pikon adalah alat musik tiup-getar tradisional Suku Dani di Lembah Baliem, Papua yang terbuat dari bilah bambu kecil dan tali." },
      { name: "Keso-keso", aliases: ["keso keso", "kacaping", "talindo"], score: 95, fact: "Alat musik gesek berdawai dua khas Toraja dan Bugis-Makassar yang badannya berbentuk perahu atau jantung pisang." }
    ]
  },

  {
    id: "antariksa-tata-surya",
    title: "Sebutkan Objek di Tata Surya atau Luar Angkasa",
    theme: "sains",
    hint: "Planet, bulan/satelit alami, rasi bintang, hingga fenomena kosmik di alam semesta!",
    educationalNote: "Cahaya dari Matahari membutuhkan waktu 8 menit 20 detik untuk sampai ke Bumi dengan kecepatan 300.000 km per detik.",
    answers: [
      // PLANKTON
      { name: "Bumi", aliases: ["earth"], score: 12, fact: "Satu-satunya planet di Tata Surya yang tidak dinamai dari dewa mitologi Yunani atau Romawi." },
      { name: "Matahari", aliases: ["sun", "surya"], score: 13, fact: "Menyumbang 99,86% dari seluruh massa yang ada di Tata Surya kita!" },
      { name: "Bulan", aliases: ["moon", "luna"], score: 14, fact: "Bulan perlahan-lahan menjauh dari Bumi dengan kecepatan sekitar 3,8 sentimeter setiap tahunnya." },
      { name: "Mars", aliases: ["planet merah"], score: 16, fact: "Rumah bagi Olympus Mons, gunung berapi tertinggi di Tata Surya yang tingginya 3 kali lipat Gunung Everest!" },
      { name: "Jupiter", aliases: ["yupiter"], score: 18, fact: "Bintik Merah Besar di Jupiter adalah badai raksasa yang ukurannya lebih besar dari planet Bumi dan telah berputar selama ratusan tahun." },
      { name: "Saturnus", aliases: ["saturn"], score: 19, fact: "Massa jenis rata-rata Saturnus lebih rendah daripada air—jika ada lautan raksasa, Saturnus akan mengapung!" },
      { name: "Venus", aliases: ["bintang kejora"], score: 22, fact: "Satu hari di Venus (rotasi) lebih lama daripada satu tahun di Venus (revolusi mengelilingi Matahari)!" },
      { name: "Merkurius", aliases: ["mercury"], score: 24, fact: "Meskipun paling dekat dengan Matahari, Merkurius bukanlah planet terpanas (Venus lebih panas karena efek rumah kaca ekstrem)." },
      { name: "Uranus", aliases: [], score: 26, fact: "Berputar miring hingga 98 derajat sehingga tampak menggelinding seperti bola di sepanjang orbitnya!" },
      { name: "Neptunus", aliases: ["neptune"], score: 27, fact: "Memiliki angin tercepat di Tata Surya yang berembus hingga kecepatan 2.100 km/jam (melampaui kecepatan suara!)." },
      { name: "Pluto", aliases: [], score: 28, fact: "Pada tahun 2006 diklasifikasikan ulang sebagai Planet Kerdil; luas permukaannya bahkan lebih kecil dari negara Rusia." },
      { name: "Bintang", aliases: ["star"], score: 20, fact: "Jumlah bintang di alam semesta teramati diperkirakan lebih banyak daripada jumlah butiran pasir di seluruh pantai Bumi." },

      // KARANG
      { name: "Lubang Hitam", aliases: ["black hole", "sagittarius a"], score: 38, fact: "Memiliki gravitasi begitu kuat hingga cahaya pun tidak dapat lolos setelah melewati batas Event Horizon." },
      { name: "Komet", aliases: ["komet halley", "bintang berekor"], score: 40, fact: "Ekor komet selalu menunjuk menjauhi Matahari karena terdorong oleh angin matahari, tidak peduli ke arah mana komet itu bergerak!" },
      { name: "Asteroid", aliases: ["sabuk asteroid"], score: 42, fact: "Sisa-sisa batuan purba dari pembentukan Tata Surya 4,6 miliar tahun yang lalu." },
      { name: "Meteor", aliases: ["meteorit", "meteoroid", "bintang jatuh"], score: 43, fact: "Disebut Meteoroid saat di angkasa, Meteor saat berpijar di atmosfer Bumi, dan Meteorit saat batuannya sampai ke tanah." },
      { name: "Bima Sakti", aliases: ["milky way", "galaksi bima sakti"], score: 45, fact: "Galaksi rumah kita bergerak mendekati Galaksi Andromeda dan akan bergabung dalam waktu sekitar 4,5 miliar tahun lagi." },
      { name: "Galaksi Andromeda", aliases: ["andromeda"], score: 48, fact: "Objek terjauh di alam semesta yang masih bisa dilihat dengan mata telanjang dari Bumi pada malam yang gelap (berjarak 2,5 juta tahun cahaya!)." },
      { name: "Nebula", aliases: ["nebula orion", "nebula kepiting"], score: 52, fact: "Awan gas dan debu raksasa di angkasa yang menjadi 'tempat kelahiran' bintang-bintang baru." },
      { name: "Supernova", aliases: [], score: 54, fact: "Ledakan dahsyat di akhir hidup bintang masif yang menciptakan unsur-unsur berat seperti emas, perak, dan besi di alam semesta." },
      { name: "Titan", aliases: [], score: 58, fact: "Bulan terbesar Saturnus dan satu-satunya benda langit selain Bumi yang memiliki sungai, hujan, dan danau cairan di permukaannya (berisi metana cair!)." },
      { name: "Europa", aliases: [], score: 62, fact: "Bulan Jupiter yang di bawah kerak esnya menyimpan samudra air asin yang volumenya dua kali lipat seluruh air laut di Bumi!" },
      { name: "Galaksi", aliases: ["galaxy"], score: 44, fact: "Terdapat sekitar 2 triliun galaksi di alam semesta yang dapat diamati." },

      // ABISAL
      { name: "Ganymede", aliases: ["ganimede"], score: 70, fact: "Bulan terbesar di seluruh Tata Surya (milik Jupiter)—ukurannya bahkan lebih besar daripada planet Merkurius!" },
      { name: "Io", aliases: ["callisto", "kalisto"], score: 74, fact: "Bulan Jupiter yang memiliki lebih dari 400 gunung berapi aktif, menjadikannya objek paling aktif secara geologis di Tata Surya." },
      { name: "Enceladus", aliases: ["enseladus"], score: 78, fact: "Bulan es Saturnus yang menyemburkan geyser air raksasa dari samudra bawah tanahnya langsung ke luar angkasa." },
      { name: "Ceres", aliases: ["seres"], score: 76, fact: "Objek terbesar di Sabuk Asteroid antara Mars dan Jupiter yang kini berstatus sebagai Planet Kerdil." },
      { name: "Pulsar", aliases: ["bintang neutron", "neutron star"], score: 80, fact: "Satu sendok teh materi Bintang Neutron memiliki berat sekitar 1 miliar ton (setara berat Gunung Everest!)." },
      { name: "Quasar", aliases: ["kuasar"], score: 83, fact: "Inti galaksi aktif yang ditenagai lubang hitam supermasif dan dapat bersinar ribuan kali lebih terang dari seluruh galaksi Bima Sakti." },
      { name: "Proxima Centauri", aliases: ["alpha centauri", "alfa centauri"], score: 79, fact: "Bintang terdekat dari Tata Surya kita dengan jarak sekitar 4,24 tahun cahaya." },
      { name: "Sirius", aliases: ["betelgeuse", "rigel", "polaris"], score: 77, fact: "Sirius adalah bintang paling terang yang tampak di langit malam Bumi." },
      { name: "Sabuk Kuiper", aliases: ["kuiper belt", "awan oort", "oort cloud"], score: 85, fact: "Wilayah dingin di tepi luar Tata Surya melewati Neptunus yang dihuni jutaan benda es purba dan planet kerdil." },
      { name: "Eksoplanet", aliases: ["exoplanet", "kepler"], score: 82, fact: "Planet yang mengorbit bintang lain di luar Tata Surya; kini sudah lebih dari 5.500 eksoplanet berhasil ditemukan astronom!" },

      // LEGENDA PALUNG
      { name: "Haumea", aliases: ["makemake", "eris", "sedna"], score: 94, fact: "Planet kerdil di tepi Tata Surya yang berputar sangat cepat (1 hari hanya 4 jam) hingga bentuknya lonjong seperti bola rugbi!" },
      { name: "Magnetar", aliases: [], score: 96, fact: "Jenis bintang neutron dengan medan magnet paling ekstrem di alam semesta—triliunan kali lebih kuat dari medan magnet Bumi." },
      { name: "Phobos", aliases: ["deimos", "triton", "charon"], score: 92, fact: "Bulan milik Mars yang mengorbit begitu dekat hingga terbit di barat dan tenggelam di timur dua kali dalam satu hari Mars!" },
      { name: "Oumuamua", aliases: [], score: 98, fact: "Objek antarbintang (Interstellar Object) pertama yang pernah terdeteksi melintasi Tata Surya kita pada tahun 2017." },
      { name: "Titania", aliases: ["oberon", "miranda", "iapetus", "mimas"], score: 97, fact: "Bulan-bulan Uranus tidak dinamai dari mitologi Yunani, melainkan dari karakter karya sastra William Shakespeare dan Alexander Pope!" }
    ]
  },

  {
    id: "ibu-kota-provinsi",
    title: "Sebutkan Ibu Kota Provinsi di Indonesia",
    theme: "nusantara",
    hint: "Kota pusat pemerintahan dari 38 provinsi di Indonesia, dari Banda Aceh hingga Jayapura dan provinsi-provinsi baru di Papua!",
    educationalNote: "Sejak tahun 2022, Indonesia memiliki 38 provinsi setelah pemekaran wilayah di Pulau Papua.",
    answers: [
      // PLANKTON
      { name: "Jakarta", aliases: ["dki jakarta"], score: 12, fact: "Telah berganti nama berkali-kali dalam sejarah: Sunda Kelapa, Jayakarta, Batavia, hingga Jakarta." },
      { name: "Bandung", aliases: [], score: 14, fact: "Ibu kota Jawa Barat yang menjadi tuan rumah Konferensi Asia-Afrika bersejarah pada tahun 1955." },
      { name: "Surabaya", aliases: [], score: 15, fact: "Ibu kota Jawa Timur dan kota terbesar kedua di Indonesia yang dijuluki Kota Pahlawan." },
      { name: "Semarang", aliases: [], score: 16, fact: "Ibu kota Jawa Tengah yang memiliki kawasan Kota Lama dan bangunan ikonik Lawang Sewu." },
      { name: "Yogyakarta", aliases: ["jogja", "yogya"], score: 16, fact: "Pernah menjadi ibu kota Republik Indonesia pada tahun 1946 hingga 1949 di masa perjuangan kemerdekaan." },
      { name: "Denpasar", aliases: [], score: 18, fact: "Ibu kota Provinsi Bali yang namanya berasal dari kata 'Den' (utara) dan 'Pasar'." },
      { name: "Medan", aliases: [], score: 20, fact: "Ibu kota Sumatera Utara dan kota metropolitan terbesar di luar Pulau Jawa." },
      { name: "Makassar", aliases: ["ujung pandang"], score: 22, fact: "Ibu kota Sulawesi Selatan dan gerbang utama kawasan Indonesia Timur sejak zaman pelayaran Phinisi." },
      { name: "Palembang", aliases: [], score: 24, fact: "Ibu kota Sumatera Selatan dan kota tertua di Indonesia (berdiri sejak 16 Juni 682 M berdasarkan Prasasti Kedukan Bukit!)." },
      { name: "Padang", aliases: [], score: 26, fact: "Ibu kota Sumatera Barat yang menghadap langsung ke Samudra Hindia dan terkenal dengan legenda Malin Kundang di Pantai Air Manis." },

      // KARANG
      { name: "Banda Aceh", aliases: [], score: 36, fact: "Ibu kota Provinsi Aceh yang berada di ujung paling barat Pulau Sumatera." },
      { name: "Pekanbaru", aliases: [], score: 38, fact: "Ibu kota Provinsi Riau yang dialiri oleh Sungai Siak, sungai terdalam di Indonesia." },
      { name: "Bandar Lampung", aliases: ["lampung"], score: 40, fact: "Ibu kota Provinsi Lampung yang terbentuk dari penyatuan dua kota kembar: Tanjungkarang dan Telukbetung." },
      { name: "Serang", aliases: [], score: 42, fact: "Ibu kota Provinsi Banten yang menyimpan situs Kesultanan Banten Lama dari abad ke-16." },
      { name: "Pontianak", aliases: [], score: 44, fact: "Ibu kota Kalimantan Barat yang dilintasi tepat oleh Garis Khatulistiwa (0 derajat lintang)!" },
      { name: "Samarinda", aliases: [], score: 45, fact: "Ibu kota Kalimantan Timur yang dibelah oleh Sungai Mahakam." },
      { name: "Banjarmasin", aliases: ["banjarbaru"], score: 46, fact: "Sejak tahun 2022, ibu kota Kalimantan Selatan resmi berpindah dari Banjarmasin (Kota Seribu Sungai) ke Banjarbaru!" },
      { name: "Manado", aliases: [], score: 48, fact: "Ibu kota Sulawesi Utara yang memiliki Taman Nasional Laut Bunaken tepat di teluk kotanya." },
      { name: "Jayapura", aliases: [], score: 50, fact: "Ibu kota Provinsi Papua yang menghadap langsung ke Samudra Pasifik dan Danau Sentani." },
      { name: "Ambon", aliases: [], score: 52, fact: "Ibu kota Provinsi Maluku yang ditetapkan oleh UNESCO sebagai 'City of Music' (Kota Musik Dunia) pada tahun 2019." },
      { name: "Mataram", aliases: [], score: 54, fact: "Ibu kota Provinsi Nusa Tenggara Barat yang terletak di Pulau Lombok." },
      { name: "Kupang", aliases: [], score: 55, fact: "Ibu kota Provinsi Nusa Tenggara Timur yang berada di bagian barat Pulau Timor." },
      { name: "Jambi", aliases: [], score: 56, fact: "Ibu kota Provinsi Jambi yang di dekatnya terdapat Kompleks Percandian Muaro Jambi, salah satu kompleks candi terluas di Asia Tenggara." },
      { name: "Bengkulu", aliases: [], score: 58, fact: "Tempat ditemukannya bunga raksasa Rafflesia arnoldii dan lokasi Benteng Marlborough." },
      { name: "Palu", aliases: [], score: 60, fact: "Ibu kota Sulawesi Tengah yang memiliki lanskap unik: memadukan teluk, sungai, lembah, dan pegunungan dalam satu kota." },
      { name: "Kendari", aliases: [], score: 62, fact: "Ibu kota Sulawesi Tenggara yang melingkari sebuah teluk indah bernama Teluk Kendari." },
      { name: "Palangka Raya", aliases: ["palangkaraya"], score: 64, fact: "Ibu kota Kalimantan Tengah yang pernah digagas oleh Presiden Soekarno pada tahun 1957 sebagai calon ibu kota negara." },

      // ABISAL
      { name: "Tanjungpinang", aliases: ["tanjung pinang"], score: 70, fact: "Ibu kota Provinsi Kepulauan Riau (bukan Batam!) yang terletak di Pulau Bintan dan Pulau Penyengat, tempat lahirnya Gurindam Dua Belas." },
      { name: "Pangkalpinang", aliases: ["pangkal pinang"], score: 72, fact: "Ibu kota Provinsi Kepulauan Bangka Belitung yang berada di pesisir timur Pulau Bangka." },
      { name: "Gorontalo", aliases: [], score: 74, fact: "Ibu kota Provinsi Gorontalo yang dijuluki Kota Serambi Madinah dan terkenal dengan hiu paus di perairan Botubarani." },
      { name: "Mamuju", aliases: [], score: 78, fact: "Ibu kota Provinsi Sulawesi Barat yang menghadap ke Selat Makassar." },
      { name: "Tanjung Selor", aliases: ["tanjung selor"], score: 84, fact: "Ibu kota Provinsi Kalimantan Utara (bukan Tarakan!) yang masih berstatus sebagai kawasan perkotaan di Kabupaten Bulungan." },
      { name: "Sofifi", aliases: [], score: 86, fact: "Ibu kota Provinsi Maluku Utara (bukan Ternate!) yang berada di pantai barat Pulau Halmahera." },
      { name: "Manokwari", aliases: [], score: 80, fact: "Ibu kota Provinsi Papua Barat yang dikelilingi oleh Pegunungan Arfak yang kaya akan burung Cenderawasih." },

      // LEGENDA PALUNG
      { name: "Merauke", aliases: [], score: 90, fact: "Ibu kota Provinsi Papua Selatan yang terkenal sebagai titik paling timur dalam semboyan 'Dari Sabang sampai Merauke'." },
      { name: "Nabire", aliases: [], score: 94, fact: "Ibu kota Provinsi Papua Tengah yang memiliki Teluk Cenderawasih, rumah bagi kawanan Hiu Paus yang ramah." },
      { name: "Wamena", aliases: ["jayawijaya"], score: 95, fact: "Ibu kota Provinsi Papua Pegunungan di Lembah Baliem—satu-satunya provinsi di Indonesia yang terkurung daratan (tidak punya garis pantai)!" },
      { name: "Sorong", aliases: [], score: 92, fact: "Ibu kota Provinsi Papua Barat Daya (provinsi ke-38 Indonesia!) dan pintu gerbang utama menuju surga bahari Raja Ampat." }
    ]
  },

  {
    id: "penemuan-penting",
    title: "Sebutkan Penemuan Penting yang Mengubah Dunia",
    theme: "umum",
    hint: "Teknologi, alat medis, sarana transportasi, hingga penemuan sehari-hari yang memajukan peradaban manusia!",
    educationalNote: "Sebagian penemuan terbesar manusia seperti Penisilin, Sinar-X, dan Oven Microwave ditemukan secara tidak sengaja di laboratorium!",
    answers: [
      // PLANKTON
      { name: "Listrik", aliases: ["generator listrik", "arus listrik"], score: 12, fact: "Michael Faraday menemukan induksi elektromagnetik pada tahun 1831 yang menjadi dasar generator listrik modern." },
      { name: "Internet", aliases: ["wifi", "world wide web", "www"], score: 14, fact: "World Wide Web (WWW) diciptakan oleh Tim Berners-Lee di CERN tahun 1989 dan diberikan gratis untuk seluruh dunia tanpa dipatenkan!" },
      { name: "Lampu", aliases: ["bola lampu", "lampu pijar"], score: 15, fact: "Thomas Edison dan timnya menguji lebih dari 3.000 bahan filamen berbeda (termasuk serat bambu) sebelum menemukan lampu pijar yang tahan lama." },
      { name: "Telepon", aliases: ["handphone", "smartphone", "ponsel", "hp"], score: 16, fact: "Alexander Graham Bell mendaftarkan paten telepon pada tahun 1876 hanya berselisih beberapa jam dari penemu lain bernama Elisha Gray!" },
      { name: "Komputer", aliases: ["laptop", "mikroprosesor"], score: 18, fact: "Komputer elektronik generasi pertama (ENIAC) beratnya mencapai 27 ton namun kemampuannya jutaan kali lebih lambat dari HP di sakumu." },
      { name: "Roda", aliases: [], score: 20, fact: "Ditemukan sekitar tahun 3500 SM di Mesopotamia—uniknya, roda pertama kali dibuat untuk meja putar pengrajin tembikar, bukan untuk kereta!" },
      { name: "Pesawat Terbang", aliases: ["pesawat"], score: 22, fact: "Penerbangan bersejarah pertama Wright Bersaudara pada tahun 1903 berlangsung selama 12 detik dengan jarak 36 meter—lebih pendek dari sayap Boeing 747!" },
      { name: "Mobil", aliases: ["mesin pembakaran", "kendaraan bermotor"], score: 24, fact: "Karl Benz mematenkan Benz Patent-Motorwagen beroda tiga pada tahun 1886, dan istrinya Bertha Benz adalah orang pertama yang menyetirnya jarak jauh!" },
      { name: "Kertas", aliases: [], score: 26, fact: "Ditemukan oleh Cai Lun di Tiongkok pada tahun 105 Masehi menggunakan kulit kayu murbei, rami, dan jaring ikan bekas." },
      { name: "Api", aliases: ["korek api"], score: 28, fact: "Kemampuan mengendalikan api oleh manusia purba memungkinkan kita memasak makanan yang mempercepat perkembangan volume otak manusia." },

      // KARANG
      { name: "Mesin Cetak", aliases: ["percetakan", "printer"], score: 38, fact: "Mesin cetak huruf lepas Johannes Gutenberg (1440) menurunkan harga buku secara drastis dan memicu era Renaisans serta Revolusi Ilmiah." },
      { name: "Mesin Uap", aliases: ["kereta api", "lokomotif"], score: 42, fact: "Penyempurnaan mesin uap oleh James Watt pada tahun 1776 menjadi motor penggerak utama Revolusi Industri di seluruh dunia." },
      { name: "Vaksin", aliases: ["imunisasi"], score: 44, fact: "Kata 'Vaksin' berasal dari bahasa Latin 'Vacca' (Sapi), karena Edward Jenner menemukan vaksin pertama (1796) dari cacar sapi!" },
      { name: "Antibiotik", aliases: ["penisilin", "penicillin"], score: 48, fact: "Alexander Fleming menemukan Penisilin secara tidak sengaja pada tahun 1928 ketika jamur Penicillium jatuh ke cawan petri bakterinya!" },
      { name: "Kompas", aliases: [], score: 46, fact: "Ditemukan pada masa Dinasti Han di Tiongkok menggunakan batu magnet alami (lodestone), membuka era penjelajahan samudra dunia." },
      { name: "Kacamata", aliases: ["lensa"], score: 50, fact: "Kacamata baca pertama dibuat di Italia utara sekitar tahun 1286, memperpanjang masa produktif para ilmuwan dan penulis hingga usia tua." },
      { name: "Kamera", aliases: ["fotografi"], score: 52, fact: "Prinsip dasar kamera (Camera Obscura / Kamar Gelap) pertama kali dijelaskan secara ilmiah oleh ilmuwan Ibnu al-Haitham (Alhazen) pada abad ke-11!" },
      { name: "Radio", aliases: ["telegraf"], score: 54, fact: "Guglielmo Marconi berhasil mengirim sinyal radio nirkabel pertama melintasi Samudra Atlantik pada tahun 1901." },
      { name: "Televisi", aliases: ["tv"], score: 53, fact: "Philo Farnsworth mendapat ide pemindaian gambar televisi elektronik baris demi baris saat sedang membajak ladang kentang keluarganya pada usia 14 tahun!" },
      { name: "Kulkas", aliases: ["pendingin", "lemari es", "ac", "pendingin ruangan"], score: 56, fact: "Pendingin buatan mengubah pola makan umat manusia karena makanan segar dan obat-obatan bisa disimpan dan dikirim ke seluruh dunia." },
      { name: "Baterai", aliases: [], score: 58, fact: "Alessandro Volta menciptakan baterai listrik pertama (Tumpukan Volta) pada tahun 1800 dari tumpukan cakram tembaga dan seng yang direndam air garam." },
      { name: "Jam", aliases: ["jam mekanik", "arloji"], score: 60, fact: "Penemuan kronometer laut oleh John Harrison pada abad ke-18 memungkinkan pelaut menentukan garis bujur secara akurat di tengah samudra." },

      // ABISAL
      { name: "Transistor", aliases: ["semikonduktor", "mikrochip"], score: 70, fact: "Ditemukan di Bell Labs tahun 1947; tanpa transistor, komputer tidak akan pernah bisa mengecil; satu chip HP modern berisi miliaran transistor mikro!" },
      { name: "Mikroskop", aliases: [], score: 68, fact: "Antonie van Leeuwenhoek membuat lensa mikroskop sendiri pada tahun 1670-an dan menjadi manusia pertama yang melihat bakteri dan sel hidup." },
      { name: "Teleskop", aliases: ["teropong bintang"], score: 72, fact: "Galileo Galilei mengarahkan teleskopnya ke langit tahun 1609 dan menemukan empat bulan besar yang mengelilingi planet Jupiter." },
      { name: "Sinar-X", aliases: ["sinar x", "rontgen", "x-ray"], score: 75, fact: "Wilhelm Röntgen menolak mematenkan penemuan Sinar-X (1895) agar seluruh rumah sakit di dunia bisa menggunakannya tanpa biaya lisensi." },
      { name: "Anestesi", aliases: ["obat bius"], score: 78, fact: "Sebelum anestesi ditemukan pada tahun 1846, operasi bedah harus dilakukan dalam kondisi pasien sadar dan selesai dalam hitungan menit!" },
      { name: "GPS", aliases: ["satelit"], score: 76, fact: "Sistem GPS harus memperhitungkan rumus Relativitas Einstein setiap detiknya karena jam atom di satelit berjalan sedikit lebih cepat daripada di Bumi!" },
      { name: "Stetoskop", aliases: [], score: 80, fact: "Diciptakan oleh dokter Prancis René Laennec pada tahun 1816 menggunakan gulungan kertas tebal untuk mendengarkan detak jantung pasien." },
      { name: "Laser", aliases: [], score: 82, fact: "Ketika pertama kali diciptakan tahun 1960, laser sempat disebut 'solusi yang belum punya masalah', kini dipakai dari operasi mata hingga serat optik internet!" },
      { name: "Serat Optik", aliases: ["fiber optik", "fiber optic"], score: 84, fact: "Kabel kaca setipis rambut manusia di dasar samudra yang membawa 99% lalu lintas data internet antarbenua menggunakan pulsa cahaya!" },
      { name: "Bajak", aliases: ["irigasi", "pupuk", "proses haber"], score: 86, fact: "Proses Haber-Bosch untuk membuat pupuk nitrogen dari udara diperkirakan telah menyelamatkan miliaran manusia dari kelaparan global." },

      // LEGENDA PALUNG
      { name: "Huruf Braille", aliases: ["braille"], score: 91, fact: "Louis Braille menciptakan sistem baca-tulis 6 titik timbul untuk penyandang tunanetra pada tahun 1824 saat ia baru berusia 15 tahun!" },
      { name: "Pasteurisasi", aliases: [], score: 93, fact: "Ditemukan oleh Louis Pasteur pada tahun 1864 untuk membunuh bakteri berbahaya dalam susu dan makanan tanpa merusak nutrisinya." },
      { name: "CRISPR", aliases: ["rekayasa genetika", "pcr"], score: 96, fact: "Teknologi 'gunting penyunting gen' yang diadaptasi ilmuwan Jennifer Doudna & Emmanuelle Charpentier dari sistem pertahanan alami bakteri terhadap virus!" },
      { name: "Kronometer", aliases: ["astrolab", "sekstan", "seismograf"], score: 98, fact: "Seismograf pendeteksi gempa bumi pertama di dunia diciptakan oleh ilmuwan Zhang Heng pada tahun 132 Masehi menggunakan guci perunggu dan bola naga!" }
    ]
  },

  {
    id: "hewan-laut",
    title: "Sebutkan Hewan atau Biota yang Hidup di Laut",
    theme: "sains",
    hint: "Dari penghuni terumbu karang dangkal hingga makhluk aneh di dasar Palung Mariana!",
    educationalNote: "Lebih dari 80% lautan di Bumi belum pernah dipetakan atau dijelajahi secara langsung oleh manusia.",
    answers: [
      // PLANKTON
      { name: "Hiu", aliases: ["ikan hiu", "shark", "hiu putih"], score: 12, fact: "Hiu sudah berenang di lautan Bumi sejak 450 juta tahun lalu—jauh lebih tua daripada dinosaurus dan bahkan lebih tua dari pohon!" },
      { name: "Paus", aliases: ["ikan paus", "whale"], score: 14, fact: "Nyanyian Paus Bungkuk di dalam air dapat merambat sejauh ribuan kilometer melintasi samudra." },
      { name: "Lumba-lumba", aliases: ["lumba lumba", "dolphin"], score: 15, fact: "Setiap lumba-lumba memiliki 'siulan tanda tangan' unik yang berfungsi persis seperti nama panggilan di antara kawanannya!" },
      { name: "Gurita", aliases: ["octopus"], score: 18, fact: "Gurita memiliki 3 jantung, darah berwarna biru (karena berbasis tembaga, bukan besi), dan 9 otak (1 otak pusat + 1 di tiap lengan)!" },
      { name: "Cumi-cumi", aliases: ["cumi cumi", "cumi", "squid"], score: 19, fact: "Cumi-cumi Raksasa di laut dalam memiliki bola mata terbesar di dunia hewan—seukuran bola basket!" },
      { name: "Ubur-ubur", aliases: ["ubur ubur", "jellyfish"], score: 20, fact: "Tidak memiliki otak, jantung, maupun tulang, serta 95% tubuhnya tersusun atas air!" },
      { name: "Bintang Laut", aliases: ["starfish", "patrick"], score: 22, fact: "Jika salah satu lengan bintang laut terputus, ia tidak hanya bisa menumbuhkan lengan baru, tetapi lengan yang putus kadang bisa tumbuh jadi bintang laut utuh!" },
      { name: "Kepiting", aliases: ["crab", "rajungan"], score: 23, fact: "Gigi kepiting tidak berada di mulutnya, melainkan berada di dalam lambungnya (disebut Gastric Mill)!" },
      { name: "Udang", aliases: ["shrimp", "lobster"], score: 24, fact: "Jantung udang terletak di bagian kepalanya (menyatu dalam ruang cephalothorax)." },
      { name: "Penyu", aliases: ["kura-kura laut", "turtle", "penyu hijau"], score: 25, fact: "Penyu betina selalu kembali ke pantai yang sama persis tempat ia menetas puluhan tahun sebelumnya untuk bertelur, dipandu oleh medan magnet Bumi!" },
      { name: "Kuda Laut", aliases: ["seahorse"], score: 27, fact: "Satu-satunya hewan di dunia di mana sang JANTAN yang mengandung dan melahirkan anak-anaknya dari kantung perutnya!" },
      { name: "Ikan Badut", aliases: ["clownfish", "nemo"], score: 28, fact: "Memiliki lapisan lendir khusus di kulitnya yang membuatnya kebal terhadap sengatan racun anemon laut." },
      { name: "Ikan Pari", aliases: ["pari", "pari manta", "stingray"], score: 30, fact: "Pari Manta memiliki rasio ukuran otak terhadap tubuh terbesar di antara seluruh jenis ikan di dunia." },

      // KARANG
      { name: "Ikan Buntal", aliases: ["buntal", "pufferfish", "fugu"], score: 38, fact: "Ikan Buntal Jantan di Jepang membuat ukiran lingkaran geometris raksasa yang sangat rapi di pasir dasar laut untuk menarik perhatian betina!" },
      { name: "Belut Laut", aliases: ["belut moray", "moray eel"], score: 42, fact: "Belut Moray memiliki rahang kedua di dalam tenggorokannya (rahang faring) yang bisa maju ke depan seperti alien untuk menarik mangsa!" },
      { name: "Teripang", aliases: ["timun laut", "mentimun laut", "sea cucumber"], score: 46, fact: "Berperan sebagai 'penyedot debu' dasar laut yang membersihkan pasir dari sisa organik dan menjaga kesehatan terumbu karang." },
      { name: "Bulu Babi", aliases: ["landak laut", "sea urchin"], score: 48, fact: "Memiliki lima gigi tajam di bagian bawah tubuhnya yang dapat mengikis batu karang dan mampu menajamkan dirinya sendiri!" },
      { name: "Kerang", aliases: ["tiram", "kerang mutiara", "kima"], score: 40, fact: "Kima Raksasa (Giant Clam) di perairan Indonesia dapat tumbuh hingga berat lebih dari 200 kilogram dan hidup lebih dari 100 tahun!" },
      { name: "Anemon Laut", aliases: ["anemon"], score: 52, fact: "Meskipun tampak seperti bunga tanaman laut, Anemon sebenarnya adalah hewan karnivora kerabat ubur-ubur!" },
      { name: "Terumbu Karang", aliases: ["karang", "koral", "coral"], score: 50, fact: "Karang bukanlah batu atau tumbuhan, melainkan koloni ribuan hewan polip mungil yang membangun kerangka kalsium karbonat bersama-sama." },
      { name: "Spons Laut", aliases: ["sponge", "spons"], score: 54, fact: "Salah satu hewan multiseluler paling purba di Bumi yang menyaring ribuan liter air laut setiap hari." },
      { name: "Ikan Tuna", aliases: ["tuna", "cakalang", "tongkol"], score: 44, fact: "Tuna Sirip Biru dapat berenang melintasi samudra dengan kecepatan hingga 70 km/jam dan mampu menjaga suhu tubuhnya lebih hangat dari air laut!" },
      { name: "Ikan Salmon", aliases: ["salmon", "ikan kakap", "ikan kerapu", "ikan teri"], score: 45, fact: "Lahir di sungai air tawar, bermigrasi ribuan kilometer ke samudra asin, lalu pulang kembali ke sungai kelahirannya menggunakan penciuman." },
      { name: "Ikan Terbang", aliases: ["flying fish", "ikan torani"], score: 58, fact: "Dapat meluncur di udara di atas permukaan laut sejauh 200 meter menggunakan sirip dadanya yang menyerupai sayap!" },
      { name: "Sotong", aliases: ["cuttlefish"], score: 60, fact: "Ahli kamuflase terbaik di laut yang dapat mengubah warna dan tekstur kulitnya dalam waktu kurang dari 1 detik meskipun ia sendiri buta warna!" },
      { name: "Krill", aliases: ["plankton"], score: 62, fact: "Krustasea mungil yang menjadi inspirasi game Krillion.io! Total biomassa Krill Antarktika mencapai ratusan juta ton dan menjadi makanan utama Paus Biru." },

      // ABISAL
      { name: "Anglerfish", aliases: ["ikan sungut ganda", "ikan lentera"], score: 68, fact: "Penghuni zona tengah malam laut dalam yang memiliki antena bercahaya di kepalanya berkat simbiosis dengan bakteri bioluminesensi!" },
      { name: "Udang Sentadu", aliases: ["udang mantis", "mantis shrimp", "udang pistol"], score: 76, fact: "Pukulan Udang Mantis melesat secepat peluru kaliber .22 hingga mendidihkan air di sekitarnya (kavitasi) dan matanya memiliki 16 reseptor warna (manusia hanya 3)!" },
      { name: "Nautilus", aliases: [], score: 80, fact: "Fosil hidup bercangkang spiral yang mengatur daya apungnya dengan memompa gas dan air di dalam ruang-ruang cangkangnya seperti kapal selam alami!" },
      { name: "Ikan Matahari", aliases: ["mola-mola", "mola mola", "ocean sunfish"], score: 78, fact: "Ikan bertulang keras terberat di dunia (bisa mencapai 2 ton!) yang sering muncul di perairan Nusa Penida, Bali untuk dibersihkan oleh ikan-ikan karang." },
      { name: "Hiu Paus", aliases: ["whale shark"], score: 72, fact: "Spesies ikan terbesar di dunia (hingga 12+ meter), namun sangat jinak karena hanya memakan plankton dan ikan-ikan mikro!" },
      { name: "Hiu Martil", aliases: ["hammerhead shark"], score: 74, fact: "Bentuk kepalanya yang melebar memberinya pandangan binokular 360 derajat dan sensor elektromagnetik super luas untuk mendeteksi ikan di bawah pasir." },
      { name: "Belut Listrik", aliases: ["ikan lepu", "lionfish", "barakuda"], score: 73, fact: "Lionfish (Ikan Lepu Ayam) memiliki sirip beracun menyerupai kipas yang indah dan merupakan predator penyergap di terumbu karang." },
      { name: "Belangkas", aliases: ["kepiting tapal kuda", "mimi", "horseshoe crab"], score: 84, fact: "Darahnya berwarna biru cerah dan sangat berharga di dunia medis karena digunakan untuk menguji kemurnian setiap vaksin dan alat suntik di dunia!" },
      { name: "Kelinci Laut", aliases: ["nudibranch", "siput laut"], score: 86, fact: "Beberapa spesies siput laut tak bercangkang (seperti Domba Daun / Costasiella) mampu memakan alga dan mengambil kloroplasnya untuk melakukan fotosintesis dengan cahaya matahari!" },

      // LEGENDA PALUNG
      { name: "Coelacanth", aliases: ["ikan raja laut", "selakan"], score: 94, fact: "Ikan purba bersirip lobus yang dikira telah punah bersama dinosaurus 66 juta tahun lalu, namun ditemukan hidup di perairan Sulawesi Utara (Ikan Raja Laut)!" },
      { name: "Axolotl", aliases: ["blobfish", "ikan blob"], score: 90, fact: "Blobfish tampak normal seperti ikan biasa saat berada di tekanan tinggi kedalaman 1.000 meter, dan hanya tampak lembek ketika diangkat ke permukaan." },
      { name: "Ubur-ubur Abadi", aliases: ["turritopsis dohrnii"], score: 97, fact: "Satu-satunya hewan yang diketahui secara biologis 'abadi': saat tua atau terluka, ia bisa mengembalikan sel tubuhnya kembali menjadi polip bayi dan tumbuh dari awal lagi!" },
      { name: "Cumi-cumi Vampir", aliases: ["vampire squid", "gurita dumbo", "dumbo octopus"], score: 96, fact: "Gurita Dumbo adalah spesies gurita terdalam yang hidup hingga kedalaman 4.000–7.000 meter dan berenang dengan mengepakkan sirip mirip telinga gajah Dumbo!" },
      { name: "Naga Laut", aliases: ["leafy seadragon", "oarfish", "ikan oar"], score: 98, fact: "Oarfish adalah ikan bertulang terpanjang di dunia (hingga 11 meter) yang hidup di kedalaman 1.000 meter dan sering menjadi asal-usul legenda ular naga laut raksasa." }
    ]
  },

  {
    id: "cabang-olahraga",
    title: "Sebutkan Cabang Olahraga (Olimpiade maupun Tradisional)",
    theme: "umum",
    hint: "Dari olahraga bola, raket, bela diri, atletik, hingga olahraga air dan ekstrem!",
    educationalNote: "Olimpiade Kuno pertama kali diadakan di Olympia, Yunani pada tahun 776 SM dengan hanya satu cabang lomba lari cepat.",
    answers: [
      // PLANKTON
      { name: "Sepak Bola", aliases: ["bola", "football", "soccer", "futsal"], score: 12, fact: "Olahraga paling populer di bumi yang ditonton oleh lebih dari 3,5 miliar orang saat Piala Dunia." },
      { name: "Bulu Tangkis", aliases: ["badminton", "bulutangkis"], score: 13, fact: "Olahraga raket tercepat di dunia: pukulan smash shuttlecock pernah tercatat mencapai kecepatan 565 km/jam (lebih cepat dari mobil Formula 1!)." },
      { name: "Bola Basket", aliases: ["basket", "basketball"], score: 15, fact: "Pertama kali diciptakan tahun 1891 oleh James Naismith menggunakan keranjang buah persik asli yang bagian bawahnya belum dilubangi!" },
      { name: "Bola Voli", aliases: ["voli", "volleyball"], score: 17, fact: "Awalnya bernama 'Mintonette' saat diciptakan oleh William G. Morgan pada tahun 1895." },
      { name: "Renang", aliases: ["berenang", "swimming"], score: 18, fact: "Menggerakkan hampir seluruh kelompok otot utama tubuh sekaligus dengan risiko cedera sendi yang sangat rendah." },
      { name: "Lari", aliases: ["maraton", "sprint", "atletik"], score: 20, fact: "Jarak lari Maraton (42,195 km) terinspirasi dari prajurit Yunani Pheidippides yang berlari dari Marathon ke Athena untuk membawa kabar kemenangan." },
      { name: "Tenis", aliases: ["tenis lapangan"], score: 24, fact: "Pertandingan tenis terpanjang dalam sejarah Wimbledon (John Isner vs Nicolas Mahut, 2010) berlangsung selama 11 jam 5 menit selama 3 hari!" },
      { name: "Tenis Meja", aliases: ["pingpong", "ping pong"], score: 25, fact: "Sempat dilarang di Uni Soviet pada tahun 1930-an karena pergerakan bola yang terlalu cepat dikhawatirkan merusak fokus mata pemain." },
      { name: "Tinju", aliases: ["boxing"], score: 27, fact: "Salah satu olahraga bela diri tertua yang sudah dipertandingkan sejak Olimpiade Kuno tahun 688 SM." },
      { name: "Catur", aliases: ["chess"], score: 26, fact: "Jumlah kemungkinan variasi langkah dalam permainan catur lebih banyak daripada jumlah atom di alam semesta teramati (Bilangan Shannon)!" },

      // KARANG
      { name: "Pencak Silat", aliases: ["silat"], score: 36, fact: "Seni bela diri asli Nusantara yang diakui oleh UNESCO sebagai Warisan Budaya Takbenda Dunia pada tahun 2019." },
      { name: "Karate", aliases: [], score: 38, fact: "Berasal dari Okinawa, Jepang; kata 'Karate' secara harfiah berarti 'Tangan Kosong'." },
      { name: "Taekwondo", aliases: [], score: 40, fact: "Seni bela diri asal Korea yang terkenal dengan teknik tendangan tinggi dan tendangan berputar yang dinamis." },
      { name: "Judo", aliases: ["jujitsu", "jiu-jitsu"], score: 44, fact: "Diciptakan oleh Jigoro Kano di Jepang tahun 1882 dengan prinsip memanfaatkan tenaga dan keseimbangan lawan untuk membanting." },
      { name: "Panahan", aliases: ["memanah", "archery"], score: 45, fact: "Cabang olahraga yang menyumbangkan medali Olimpiade pertama dalam sejarah Indonesia pada Olimpiade Seoul 1988 (Tiga Srikandi)!" },
      { name: "Angkat Besi", aliases: ["weightlifting"], score: 46, fact: "Salah satu cabang olahraga penyumbang medali Olimpiade terbanyak dan paling konsisten bagi kontingen Indonesia." },
      { name: "Panjat Tebing", aliases: ["rock climbing", "wall climbing", "panjat dinding"], score: 48, fact: "Atlet Indonesia memegang rekor dunia Speed Climbing dan meraih medali emas Olimpiade Paris 2024 dalam waktu kurang dari 5 detik!" },
      { name: "Balap Sepeda", aliases: ["bersepeda", "bmx", "cycling"], score: 44, fact: "Tour de France pertama kali digelar tahun 1903 untuk meningkatkan penjualan surat kabar olahraga L'Auto." },
      { name: "Golf", aliases: [], score: 49, fact: "Satu-satunya olahraga yang pernah dimainkan di luar Bumi: astronot Alan Shepard memukul dua bola golf di permukaan Bulan pada misi Apollo 14 tahun 1971!" },
      { name: "Senam", aliases: ["gymnastics", "senam lantai", "senam artistik"], score: 50, fact: "Menggabungkan kekuatan, kelenturan, keseimbangan, dan koordinasi akrobatik tingkat tinggi." },
      { name: "Bisbol", aliases: ["baseball", "kasti", "softball"], score: 52, fact: "Bola bisbol profesional dijahit tangan dengan tepat 108 jahitan benang merah." },
      { name: "Biliar", aliases: ["billiard", "snooker"], score: 54, fact: "Awalnya dimainkan di atas halaman rumput luar ruangan pada abad ke-15 sebelum dipindahkan ke atas meja berlapis kain hijau (yang melambangkan rumput!)." },
      { name: "Selancar", aliases: ["surfing"], score: 56, fact: "Memulai debut resminya sebagai cabang olahraga Olimpiade pada Olimpiade Tokyo 2020." },
      { name: "Sepak Takraw", aliases: ["takraw"], score: 58, fact: "Olahraga akrobatik asli Asia Tenggara yang memadukan kelincahan sepak bola, peraturan bola voli, dan bola anyaman rotan." },

      // ABISAL
      { name: "Anggar", aliases: ["fencing"], score: 68, fact: "Ujung pedang anggar adalah objek tercepat kedua dalam olahraga Olimpiade setelah peluru menembak; pakaian anggar berwarna putih karena dulu ujung pedang diberi tinta untuk mencatat skor!" },
      { name: "Dayung", aliases: ["rowing", "kano", "perahu naga"], score: 70, fact: "Salah satu olahraga paling menguras kalori dan daya tahan kardiovaskular di Olimpiade." },
      { name: "Berkuda", aliases: ["equestrian", "polo"], score: 72, fact: "Satu-satunya cabang Olimpiade di mana manusia dan hewan bertanding bersama sebagai rekan satu tim dan keduanya mendapatkan medali." },
      { name: "Kriket", aliases: ["cricket"], score: 74, fact: "Olahraga terpopuler kedua di dunia (sangat digemari di India, Inggris, dan Australia); satu pertandingan Test Cricket bisa berlangsung hingga 5 hari!" },
      { name: "Rugbi", aliases: ["rugby", "american football"], score: 73, fact: "Lahir di Sekolah Rugby, Inggris pada tahun 1823 ketika seorang siswa bernama William Webb Ellis tiba-tiba mengambil bola sepak dan berlari membawanya dengan tangan!" },
      { name: "Hoki", aliases: ["hoki es", "ice hockey", "hoki lapangan"], score: 76, fact: "Kepingan (puck) Hoki Es selalu dibekukan terlebih dahulu sebelum pertandingan agar tidak memantul liar di atas es." },
      { name: "Lompat Galah", aliases: ["lompat tinggi", "lompat jauh", "tolak peluru", "lempar lembing"], score: 78, fact: "Awalnya galah digunakan oleh penduduk di Belanda untuk melompati kanal-kanal air di sawah daripada harus memutar lewat jembatan!" },
      { name: "Gulat", aliases: ["wrestling", "sumo"], score: 75, fact: "Seni bela diri kontak fisik yang tergambar di lukisan dinding gua berusia 15.000 tahun di Prancis." },
      { name: "Wushu", aliases: ["kungfu", "muay thai", "kempo", "capoeira"], score: 77, fact: "Menggabungkan unsur seni keindahan gerak jurus (Taolu) dan pertarungan bebas (Sanda)." },
      { name: "Loncat Indah", aliases: ["polo air", "renang indah"], score: 80, fact: "Dalam pertandingan Polo Air, penjaga gawang dan pemain tidak boleh menyentuh dasar kolam sama sekali selama pertandingan berlangsung!" },
      { name: "Curling", aliases: [], score: 86, fact: "Dijuluki 'Catur di Atas Es': pemain meluncurkan batu granit seberat 19 kg dari pulau terpencil Ailsa Craig di Skotlandia sambil menyapu permukaan es!" },

      // LEGENDA PALUNG
      { name: "Kabaddi", aliases: [], score: 92, fact: "Olahraga tim tradisional asal Asia Selatan yang dipertandingkan di Asian Games, di mana penyerang harus menyentuh lawan dan kembali ke wilayahnya dalam satu tarikan napas sambil meneriakkan 'Kabaddi'!" },
      { name: "Biatlon", aliases: ["biathlon", "dekatlon", "heptatlon", "triatlon"], score: 94, fact: "Biatlon menggabungkan dua keterampilan kontras: balap ski lintas alam yang memacu detak jantung tinggi, lalu langsung berhenti untuk menembak sasaran kecil dengan detak jantung tenang!" },
      { name: "Pacu Jalur", aliases: ["karapan sapi", "lompat batu"], score: 96, fact: "Balap perahu kayu panjang tradisional dari Kuantan Singingi, Riau yang diawaki oleh 40 hingga 60 pendayung sekaligus dengan seorang penari cilik (Togak Luan) di ujung haluan!" },
      { name: "Jai Alai", aliases: ["squash", "padel", "lacrosse", "bobsleigh", "luge"], score: 98, fact: "Olahraga asal wilayah Basque yang menggunakan keranjang melengkung untuk melempar bola keras hingga kecepatan 300 km/jam!" }
    ]
  },

  {
    id: "buah-buahan",
    title: "Sebutkan Nama Buah-Buahan",
    theme: "sains",
    hint: "Dari buah meja sehari-hari hingga buah tropis langka Nusantara dan dunia!",
    educationalNote: "Secara botani, banyak sayuran dapur seperti tomat, cabai, dan mentimun sebenarnya adalah buah karena berkembang dari bunga dan memiliki biji.",
    answers: [
      // PLANKTON
      { name: "Apel", aliases: ["apple"], score: 12, fact: "Apel mengapung di atas air karena sekitar 25% dari volumenya terdiri dari kantung udara!" },
      { name: "Pisang", aliases: ["banana"], score: 13, fact: "Secara botani, pohon pisang bukanlah pohon kayu melainkan tanaman herba raksasa, dan buah pisang diklasifikasikan sebagai buah beri!" },
      { name: "Jeruk", aliases: ["orange", "jeruk nipis", "jeruk bali"], score: 14, fact: "Warna buah jeruk di daerah tropis seperti Indonesia tetap hijau atau kekuningan meskipun sudah manis karena suhu malam yang hangat tidak memecah klorofil kulitnya." },
      { name: "Mangga", aliases: ["mango"], score: 15, fact: "Buah nasional India, Pakistan, dan Filipina yang pohonnya bisa hidup dan berbuah hingga usia lebih dari 300 tahun!" },
      { name: "Semangka", aliases: ["watermelon"], score: 17, fact: "Mengandung 92% air; penjelajah gurun Kalahari kuno sering membawa semangka liar sebagai kantung air alami." },
      { name: "Anggur", aliases: ["grape"], score: 18, fact: "Salah satu tanaman buah tertua yang dibudidayakan manusia sejak 8.000 tahun lalu di wilayah Kaukasus." },
      { name: "Stroberi", aliases: ["strawberry"], score: 20, fact: "Satu-satunya buah yang bijinya tumbuh di bagian luar kulit (rata-rata ada tepat 200 biji pada setiap satu buah stroberi!)." },
      { name: "Melon", aliases: [], score: 22, fact: "Di Jepang, melon Yubari King yang dirawat dengan pijatan khusus pernah dilelang dengan harga ratusan juta rupiah per pasang!" },
      { name: "Nanas", aliases: ["pineapple"], score: 23, fact: "Satu buah nanas sebenarnya bukan satu buah tunggal, melainkan kumpulan puluhan buah beri kecil yang menyatu pada satu inti tengah!" },
      { name: "Pepaya", aliases: ["papaya"], score: 24, fact: "Mengandung enzim Papain yang sangat efektif digunakan untuk mengempukkan daging secara alami." },
      { name: "Durian", aliases: ["duren"], score: 22, fact: "Dijuluki Raja Buah di Asia Tenggara; di hutan alam, bunga durian diserbuki pada malam hari oleh kelelawar pemakan nektar!" },
      { name: "Alpukat", aliases: ["avocado", "apokat"], score: 26, fact: "Tidak pernah matang saat masih menggantung di pohon—buah alpukat baru mulai melunak setelah dipetik dari tangkainya!" },
      { name: "Kelapa", aliases: ["coconut"], score: 27, fact: "Air kelapa muda yang masih tersegel di dalam buah sangat steril hingga pernah digunakan sebagai cairan infus darurat pada masa Perang Dunia II." },

      // KARANG
      { name: "Manggis", aliases: ["mangosteen"], score: 36, fact: "Jumlah kelopak kecil di bagian bawah buah manggis selalu sama persis dengan jumlah isi siung putih di dalam buahnya!" },
      { name: "Rambutan", aliases: [], score: 38, fact: "Kata 'Rambutan' dari bahasa Indonesia telah diserap langsung ke dalam bahasa Inggris dan bahasa-bahasa dunia lainnya." },
      { name: "Salak", aliases: ["snake fruit"], score: 40, fact: "Dalam bahasa Inggris disebut 'Snake Fruit' karena kulitnya yang bersisik rapi menyerupai sisik ular." },
      { name: "Jambu Biji", aliases: ["jambu", "jambu air", "guava"], score: 41, fact: "Kandungan Vitamin C pada satu buah jambu biji ternyata 4 kali lipat lebih tinggi dibandingkan satu buah jeruk!" },
      { name: "Nangka", aliases: ["jackfruit"], score: 44, fact: "Buah pohon terbesar di dunia: satu buah nangka dapat tumbuh hingga berat 35 kilogram dan panjang 90 cm!" },
      { name: "Belimbing", aliases: ["starfruit"], score: 45, fact: "Ketika dipotong melintang, bentuknya menyerupai bintang bersudut lima yang simetris." },
      { name: "Sirsak", aliases: ["nangka belanda", "soursop"], score: 47, fact: "Namanya berasal dari bahasa Belanda 'Zuurzak' yang secara harfiah berarti 'Kantung Asam'." },
      { name: "Buah Naga", aliases: ["dragon fruit", "pitaya"], score: 42, fact: "Tumbuh dari tanaman kaktus merambat yang bunganya hanya mekar pada malam hari selama satu malam saja!" },
      { name: "Kurma", aliases: ["date"], score: 48, fact: "Biji kurma berusia 2.000 tahun yang ditemukan di situs arkeologi Masada berhasil ditanam ilmuwan dan tumbuh menjadi pohon kurma hidup!" },
      { name: "Delima", aliases: ["pomegranate"], score: 52, fact: "Satu buah delima dapat berisi lebih dari 600 hingga 1.000 butir biji berair (aril) yang kaya antioksidan." },
      { name: "Kiwi", aliases: [], score: 49, fact: "Awalnya berasal dari Tiongkok dengan nama Chinese Gooseberry, lalu dinamai ulang oleh petani Selandia Baru dari nama burung nasional mereka, Kiwi!" },
      { name: "Leci", aliases: ["lychee", "kelengkeng", "lengkeng"], score: 50, fact: "Kelengkeng dijuluki 'Mata Naga' dalam budaya Tionghoa karena daging buahnya yang putih bening dengan biji hitam bundar di tengahnya." },
      { name: "Duku", aliases: ["langsat", "kokosan"], score: 54, fact: "Buah asli Asia Tenggara yang pohonnya baru berbuah lebat setelah berusia 10 hingga 15 tahun." },
      { name: "Markisa", aliases: ["passion fruit"], score: 56, fact: "Sangat populer di Sumatera Utara dan Sulawesi Selatan sebagai bahan sirup segar kaya vitamin A dan C." },
      { name: "Srikaya", aliases: ["sugar apple"], score: 60, fact: "Memiliki kulit berbenjol-benjol unik dengan daging buah putih yang sangat manis dan bertekstur lembut seperti puding." },

      // ABISAL
      { name: "Sawo", aliases: ["sawo manila", "sawo kecik"], score: 66, fact: "Getah pohon sawo (Chicle) di Amerika Tengah adalah bahan asli yang digunakan untuk membuat permen karet pertama di dunia!" },
      { name: "Kedondong", aliases: [], score: 68, fact: "Memiliki biji unik yang diselimuti serat-serat keras menyerupai duri jaring di bagian tengah buahnya." },
      { name: "Sukun", aliases: ["breadfruit", "cempedak"], score: 70, fact: "Dalam bahasa Inggris disebut 'Breadfruit' (Buah Roti) karena kandungan karbohidratnya tinggi dan teksturnya mirip roti hangat saat dipanggang." },
      { name: "Kesemek", aliases: ["persimmon"], score: 74, fact: "Dijuluki 'Buah Genit' di Indonesia karena kulitnya selalu dilapisi bedak putih (kapur sirih) untuk menghilangkan rasa sepat taninnya!" },
      { name: "Mengkudu", aliases: ["pace", "noni"], score: 75, fact: "Meskipun beraroma tajam saat matang, mengkudu kaya senyawa xeronine dan antioksidan yang digunakan dalam pengobatan tradisional Pasifik dan Nusantara." },
      { name: "Matoa", aliases: [], score: 78, fact: "Buah eksotis asli tanah Papua yang cita rasanya unik karena memadukan rasa kelengkeng, rambutan, dan durian sekaligus!" },
      { name: "Ciplukan", aliases: ["ceplukan", "golden berry", "physalis"], score: 82, fact: "Dulu sering tumbuh liar di pematang sawah, kini Ciplukan dibungkus kelopak alaminya dan dijual di supermarket dunia sebagai Superfood mahal!" },
      { name: "Buah Tin", aliases: ["ara", "fig"], score: 79, fact: "Bunga pohon Tin tidak mekar di luar, melainkan tumbuh tersembunyi di bagian dalam buahnya sendiri!" },
      { name: "Zaitun", aliases: ["olive", "cranberry", "blueberry", "raspberry", "blackberry"], score: 72, fact: "Pohon zaitun dapat hidup selama ribuan tahun; beberapa pohon zaitun di Mediterania masih berbuah meski telah berusia lebih dari 2.000 tahun." },
      { name: "Bengkuang", aliases: ["bengkoang", "blewah", "timun suri"], score: 76, fact: "Blewah dan Timun Suri adalah buah keluarga labu-labuan yang panennya melonjak berkali-kali lipat setiap bulan Ramadan di Indonesia." },

      // LEGENDA PALUNG
      { name: "Kepel", aliases: ["burahol"], score: 94, fact: "Buah langka favorit putri-putri Keraton Jawa zaman dahulu karena berfungsi sebagai deodoran alami yang membuat keringat beraroma harum bunga mawar!" },
      { name: "Gandaria", aliases: ["jatake", "ramania"], score: 93, fact: "Buah flora identitas Provinsi Jawa Barat yang saat muda berwarna hijau untuk sambal segar dan saat matang berwarna kuning-oranye manis." },
      { name: "Buni", aliases: ["wuni", "jamblang", "duwet", "juwet"], score: 92, fact: "Jamblang (Duwet) adalah buah berwarna ungu kehitaman kaya antosianin yang meninggalkan warna ungu di lidah saat dimakan!" },
      { name: "Buah Merah", aliases: ["pandanus conoideus"], score: 95, fact: "Buah endemik Pegunungan Papua sepanjang hingga 1 meter yang kaya beta-karoten dan tokoferol untuk menjaga daya tahan tubuh di suhu dingin pegunungan." },
      { name: "Bisbul", aliases: ["buah mentega", "kawista", "mundu", "kecapi"], score: 97, fact: "Kawista adalah buah bercangkang keras khas pesisir Rembang dan Bima yang bagian dalamnya beraroma wangi dan dijuluki 'Cola van Java'!" },
      { name: "Lobi-lobi", aliases: ["lobi lobi", "rukem", "gowok", "kupa"], score: 99, fact: "Buah lokal Nusantara berwarna merah bulat kecil dengan rasa asam-manis segar yang kini makin langka dan dilestarikan di kebun raya." }
    ]
  },

  {
    id: "pahlawan-nasional",
    title: "Sebutkan Pahlawan Nasional Indonesia",
    theme: "nusantara",
    hint: "Tokoh perjuangan kemerdekaan, pendidikan, emansipasi, dan pemersatu bangsa dari seluruh penjuru Nusantara!",
    educationalNote: "Gelar Pahlawan Nasional diberikan kepada tokoh yang berjasa luar biasa bagi perjuangan dan kemajuan bangsa Indonesia.",
    answers: [
      // PLANKTON
      { name: "Soekarno", aliases: ["ir soekarno", "bung karno", "sukarno"], score: 12, fact: "Proklamator dan Presiden pertama RI yang menguasai lebih dari 6 bahasa asing dan merupakan lulusan Teknik Sipil ITB (THS Bandung)." },
      { name: "Mohammad Hatta", aliases: ["bung hatta", "hatta", "moh hatta"], score: 14, fact: "Proklamator dan Bapak Koperasi Indonesia yang sangat mencintai buku hingga membawa 16 peti buku saat diasingkan ke Boven Digoel!" },
      { name: "R.A. Kartini", aliases: ["kartini", "ra kartini", "raden ajeng kartini"], score: 15, fact: "Kumpulan surat-surat pemikirannya dibukukan dengan judul 'Habis Gelap Terbitlah Terang' dan menginspirasi pendidikan perempuan Indonesia." },
      { name: "Jenderal Sudirman", aliases: ["soedirman", "sudirman", "panglima besar soedirman"], score: 16, fact: "Memimpin perang gerilya sejauh ratusan kilometer dari atas tandu selama 7 bulan meskipun hanya memiliki satu paru-paru yang berfungsi!" },
      { name: "Ki Hajar Dewantara", aliases: ["ki hadjar dewantara", "suwardi suryaningrat"], score: 18, fact: "Bapak Pendidikan Nasional pendiri Taman Siswa yang mencetuskan semboyan 'Ing Ngarso Sung Tulodho, Ing Madyo Mangun Karso, Tut Wuri Handayani'." },
      { name: "Pangeran Diponegoro", aliases: ["diponegoro"], score: 19, fact: "Babad Diponegoro yang ditulis sendiri oleh Pangeran Diponegoro selama pengasingan telah diakui UNESCO sebagai Memory of the World!" },
      { name: "Cut Nyak Dhien", aliases: ["cut nyak dien"], score: 20, fact: "Pahlawan perempuan dari Aceh yang memimpin perlawanan gerilya di hutan selama 25 tahun hingga dijuluki 'Ratu Aceh' oleh Belanda." },
      { name: "Pattimura", aliases: ["kapitan pattimura", "thomas matulessy"], score: 22, fact: "Memimpin rakyat Maluku merebut Benteng Duurstede di Pulau Saparua pada tahun 1817; wajahnya diabadikan pada uang kertas Rp1.000." },
      { name: "Imam Bonjol", aliases: ["tuanku imam bonjol"], score: 24, fact: "Pemimpin perjuangan di Sumatera Barat yang namanya terinspirasi dari benteng pertahanan di lereng bukit Bonjol, Pasaman." },
      { name: "Bung Tomo", aliases: ["sutomo"], score: 26, fact: "Orasi radionya yang berapi-api membakar semangat arek-arek Suroboyo dalam Pertempuran 10 November 1945 yang kini diperingati sebagai Hari Pahlawan." },

      // KARANG
      { name: "Sultan Hasanuddin", aliases: ["hasanuddin"], score: 36, fact: "Raja Gowa ke-16 dari Sulawesi Selatan yang dijuluki 'Ayam Jantan dari Timur' karena keberaniannya melawan monopoli VOC." },
      { name: "Teuku Umar", aliases: [], score: 38, fact: "Ahli strategi perang Aceh yang terkenal dengan taktik cerdiknya menyamar berpura-pura bekerja sama sebelum berbalik membawa logistik untuk pejuang Aceh." },
      { name: "Cut Meutia", aliases: ["tjut meutia"], score: 40, fact: "Pahlawan perempuan dari Aceh Utara yang diabadikan pada uang kertas Rp1.000 emisi terbaru." },
      { name: "Dewi Sartika", aliases: ["raden dewi sartika"], score: 42, fact: "Mendirikan Sakola Istri (Sekolah Perempuan) pertama di Hindia Belanda pada tahun 1904 di Pendopo Kabupaten Bandung." },
      { name: "Martha Christina Tiahahu", aliases: ["martha christina"], score: 46, fact: "Ikut mengangkat senjata melawan penjajah di Pulau Nusalaut dan Saparua, Maluku saat usianya baru menginjak 17 tahun!" },
      { name: "Pangeran Antasari", aliases: ["antasari"], score: 45, fact: "Pahlawan dari Kalimantan Selatan dengan semboyan terkenalnya 'Haram Manyarah Waja Sampai Kaputing' (Pantang menyerah sampai akhir)." },
      { name: "Sisingamangaraja XII", aliases: ["sisingamangaraja"], score: 48, fact: "Pemimpin perjuangan rakyat Batak di Sumatera Utara yang berjuang mempertahankan kemerdekaan tanah Tapanuli selama 30 tahun." },
      { name: "Wage Rudolf Supratman", aliases: ["wr supratman", "w r supratman"], score: 44, fact: "Memperdengarkan lagu Indonesia Raya untuk pertama kalinya dengan gesekan biola pada penutupan Kongres Pemuda II tanggal 28 Oktober 1928." },
      { name: "Mohammad Yamin", aliases: ["moh yamin"], score: 50, fact: "Sastrawan dan ahli hukum yang merumuskan teks Sumpah Pemuda 1928 untuk menyatukan tanah air, bangsa, dan bahasa Indonesia." },
      { name: "Hasyim Asy'ari", aliases: ["kh hasyim asyari", "hasyim asyari"], score: 52, fact: "Pendiri Nahdlatul Ulama yang mengeluarkan Resolusi Jihad tanggal 22 Oktober 1945 untuk mempertahankan kemerdekaan RI." },
      { name: "Ahmad Dahlan", aliases: ["kh ahmad dahlan"], score: 53, fact: "Pendiri Muhammadiyah pada tahun 1912 yang memelopori pembaruan pendidikan modern, rumah sakit, dan panti sosial bagi masyarakat." },
      { name: "Sutan Sjahrir", aliases: ["sutan syahrir", "sjahrir"], score: 56, fact: "Perdana Menteri pertama Indonesia yang memimpin diplomasi kemerdekaan di panggung internasional saat baru berusia 36 tahun!" },
      { name: "Tan Malaka", aliases: [], score: 58, fact: "Penulis buku filsafat 'Madilog' yang sudah mempublikasikan gagasan konsep 'Naar de Republiek Indonesia' (Menuju Republik Indonesia) sejak tahun 1925." },
      { name: "Agus Salim", aliases: ["haji agus salim"], score: 60, fact: "Diplomat ulung Indonesia yang menguasai 9 bahasa asing dan memimpin misi diplomatik pertama yang meraih pengakuan kedaulatan RI dari Mesir tahun 1947!" },

      // ABISAL
      { name: "Frans Kaisiepo", aliases: [], score: 68, fact: "Pahlawan Nasional dari Papua yang mengusulkan nama 'Irian' (Ikut Republik Indonesia Anti Nederland) dan mengibarkan Merah Putih di Biak tahun 1945." },
      { name: "Laksamana Malahayati", aliases: ["keumalahayati", "malahayati"], score: 72, fact: "Laksamana angkatan laut perempuan pertama di dunia modern (abad ke-16) dari Kesultanan Aceh yang memimpin 2.000 armada Inong Balee!" },
      { name: "I Gusti Ngurah Rai", aliases: ["ngurah rai"], score: 66, fact: "Memimpin pasukan Ciung Wanara dalam perang Puputan Margarana di Bali pada 20 November 1946." },
      { name: "Sam Ratulangi", aliases: ["gssj ratulangi"], score: 70, fact: "Peraih gelar Doktor Ilmu Pasti & Alam di Swiss tahun 1919 dari Minahasa dengan filosofi kemanusiaan 'Si Tou Timou Tumou Tou' (Manusia hidup untuk memanusiakan orang lain)." },
      { name: "Djuanda Kartawidjaja", aliases: ["ir djuanda", "djuanda"], score: 75, fact: "Mencetuskan Deklarasi Djuanda 1957 yang menyatukan seluruh laut di antara pulau-pulau Indonesia sehingga luas wilayah RI bertambah 2,5 kali lipat!" },
      { name: "Sultan Agung", aliases: ["sultan nayoan", "sultan baabullah", "sultan mahmud badaruddin"], score: 76, fact: "Sultan Baabullah dari Ternate berhasil mengusir Portugis dari Maluku pada tahun 1575 dan dijuluki Penguasa 72 Pulau." },
      { name: "Silas Papare", aliases: ["marthen indey", "johannes leimena"], score: 80, fact: "Pahlawan kemerdekaan dari Papua yang membentuk Partai Kemerdekaan Indonesia Irian (PKII) pada tahun 1946." },
      { name: "Maria Walanda Maramis", aliases: ["rasuna said", "hr rasuna said", "nyai ahmad dahlan", "rohana kudus"], score: 82, fact: "Rohana Kudus adalah jurnalis perempuan pertama di Indonesia yang mendirikan surat kabar 'Sunting Melayu' pada tahun 1912!" },
      { name: "Tjilik Riwut", aliases: [], score: 84, fact: "Pahlawan dari Suku Dayak Kalimantan Tengah yang memimpin operasi penerjunan payung pertama dalam sejarah militer Indonesia pada 17 Oktober 1947!" },
      { name: "Halim Perdanakusuma", aliases: ["abdulrachman saleh", "adisutjipto", "iswahjudi", "yos sudarso"], score: 78, fact: "Abdulrachman Saleh bukan hanya penerbang perintis TNI AU, tetapi juga dokter, profesor fisiologi, dan pendiri Radio Republik Indonesia (RRI)!" },

      // LEGENDA PALUNG
      { name: "Lafran Pane", aliases: ["kasman singodimedjo", "mohammad natsir", "wahid hasyim"], score: 90, fact: "Kasman Singodimedjo berperan krusial pada 18 Agustus 1945 dalam menyepakati sila pertama Pancasila demi persatuan seluruh bangsa Indonesia." },
      { name: "Opu Daeng Risadju", aliases: ["andi djema", "pong tiku", "robert wolter monginsidi"], score: 93, fact: "Pahlawan perempuan dari Luwu, Sulawesi Selatan yang tetap teguh memperjuangkan kemerdekaan RI meski mengalami penyiksaan hingga kehilangan pendengaran." },
      { name: "Izaak Huru Doko", aliases: ["el tari", "herman johannes"], score: 95, fact: "Prof. Herman Johannes dari Rote, NTT adalah fisikawan, rektor UGM, dan ahli kimia yang merakit bahan peledak jembatan untuk menghambat pasukan penjajah saat perang gerilya!" },
      { name: "Sultan Himayatuddin", aliases: ["la karambau", "radin inten", "depati amir", "inabuy"], score: 97, fact: "Sultan Himayatuddin Muhammad Saidi (Oputa Yi Koo) dari Kesultanan Buton bergerilya di hutan Gunung Siontapina menentang VOC hingga akhir hayatnya." }
    ]
  },

  {
    id: "negara-eropa",
    title: "Sebutkan Negara di Benua Eropa",
    theme: "geografi",
    hint: "Dari negara besar di Eropa Barat hingga negara-negara kecil dan Nordik!",
    educationalNote: "Eropa memiliki sekitar 44–50 negara, termasuk negara terkecil di dunia (Vatikan) dan negara terluas di dunia (Rusia yang lintas benua).",
    answers: [
      // PLANKTON
      { name: "Inggris", aliases: ["uk", "britania raya", "united kingdom", "england"], score: 12, fact: "Kereta bawah tanah London (The Tube) adalah sistem metro bawah tanah tertua di dunia yang beroperasi sejak tahun 1863." },
      { name: "Prancis", aliases: ["perancis", "france"], score: 13, fact: "Negara yang paling banyak dikunjungi wisatawan di dunia dan memiliki 12 zona waktu berbeda karena wilayah seberang lautnya!" },
      { name: "Jerman", aliases: ["germany", "deutschland"], score: 14, fact: "Memiliki lebih dari 20.000 kastil bersejarah dan merupakan tempat lahirnya mesin cetak, mobil, serta aspirin." },
      { name: "Italia", aliases: ["italy"], score: 15, fact: "Negara dengan jumlah Situs Warisan Dunia UNESCO terbanyak di dunia (lebih dari 58 situs!)." },
      { name: "Spanyol", aliases: ["spain"], score: 16, fact: "Lagu kebangsaan Spanyol (Marcha Real) adalah satu dari sedikit lagu kebangsaan di dunia yang tidak memiliki lirik resmi!" },
      { name: "Belanda", aliases: ["netherlands", "holland"], score: 18, fact: "Sekitar sepertiga wilayah daratan Belanda berada di bawah permukaan air laut dan dilindungi oleh sistem tanggul canggih." },
      { name: "Rusia", aliases: ["russia"], score: 19, fact: "Negara terluas di dunia (17,1 juta km persegi) yang membentang di Eropa Timur dan Asia Utara melintasi 11 zona waktu." },
      { name: "Portugal", aliases: [], score: 22, fact: "Memiliki toko buku tertua di dunia yang masih beroperasi terus-menerus sejak tahun 1732 (Livraria Bertrand di Lisabon)." },
      { name: "Swiss", aliases: ["switzerland"], score: 25, fact: "Tidak memiliki satu ibu kota resmi secara konstitusi (Bern berstatus sebagai 'Kota Federal') dan memiliki 4 bahasa nasional resmi." },

      // KARANG
      { name: "Swedia", aliases: ["sweden"], score: 36, fact: "Tempat lahirnya Penghargaan Nobel dan memiliki lebih dari 267.000 pulau (jumlah pulau terbanyak di dunia!)." },
      { name: "Norwegia", aliases: ["norway"], score: 38, fact: "Memiliki Gudang Benih Global Svalbard di dalam gunung es Arktik untuk mengamankan cadangan benih tanaman pangan seluruh dunia." },
      { name: "Denmark", aliases: [], score: 40, fact: "Tempat lahirnya mainan balok LEGO (dari kata bahasa Denmark 'Leg Godt' yang berarti 'Bermain dengan Baik')." },
      { name: "Finlandia", aliases: ["finland"], score: 42, fact: "Dinobatkan sebagai negara paling bahagia di dunia selama 7 tahun berturut-turut dan memiliki lebih dari 3 juta ruang sauna!" },
      { name: "Polandia", aliases: ["poland"], score: 44, fact: "Tempat kelahiran ilmuwan astronomi Nicolaus Copernicus dan peraih dua Nobel, Marie Curie." },
      { name: "Yunani", aliases: ["greece"], score: 43, fact: "Tempat lahirnya Olimpiade, teater drama, filsafat Barat, dan memiliki ribuan pulau di Laut Aegea." },
      { name: "Belgia", aliases: ["belgium"], score: 45, fact: "Bandara Brussels adalah tempat penjualan cokelat terbesar di dunia!" },
      { name: "Austria", aliases: [], score: 46, fact: "Ibu kotanya, Wina, adalah pusat musik klasik dunia tempat berkaryanya Mozart, Beethoven, dan Schubert." },
      { name: "Ukraina", aliases: ["ukraine"], score: 47, fact: "Dijuluki 'Keranjang Roti Eropa' karena memiliki tanah hitam super subur (Chernozem) yang sangat luas." },
      { name: "Kroasia", aliases: ["croatia"], score: 50, fact: "Tempat asal-usul pemakaian Dasi (Cravat) pada abad ke-17 dan rumah bagi Taman Nasional Danau Plitvice." },
      { name: "Irlandia", aliases: ["ireland"], score: 52, fact: "Satu-satunya negara di dunia yang lambang nasional resminya adalah sebuah alat musik (Harpa Celtic)." },
      { name: "Islandia", aliases: ["iceland"], score: 54, fact: "Tidak memiliki nyamuk sama sekali dan hampir 100% listrik serta pemanas rumahnya berasal dari energi panas bumi (geotermal) dan air!" },
      { name: "Ceko", aliases: ["republik ceko", "czechia", "ceko"], score: 56, fact: "Kata 'Robot' pertama kali diciptakan oleh penulis Ceko, Karel Čapek, dalam naskah dramanya pada tahun 1920." },
      { name: "Hungaria", aliases: ["hungary", "hongaria"], score: 58, fact: "Tempat lahirnya Kubus Rubik yang diciptakan oleh profesor arsitektur Ernő Rubik di Budapest pada tahun 1974." },
      { name: "Rumania", aliases: ["romania"], score: 60, fact: "Memiliki hutan tua Transylvania dan gedung parlemen di Bukares yang merupakan bangunan terberat di dunia." },

      // ABISAL
      { name: "Vatikan", aliases: ["vatican"], score: 68, fact: "Negara merdeka terkecil di dunia dengan luas hanya 0,49 km persegi (bisa dikelilingi dengan berjalan kaki dalam waktu 45 menit!)." },
      { name: "Monako", aliases: ["monaco"], score: 70, fact: "Negara berdaulat terpadat di dunia dengan luas hanya sekitar 2 km persegi di tepi Laut Mediterania." },
      { name: "Serbia", aliases: [], score: 72, fact: "Salah satu pengekspor buah raspberry terbesar di dunia dan tanah leluhur ilmuwan listrik Nikola Tesla." },
      { name: "Bulgaria", aliases: [], score: 74, fact: "Tempat lahirnya aksara Sirilik pada abad ke-9 dan penghasil lebih dari separuh minyak bunga mawar dunia." },
      { name: "Slowakia", aliases: ["slovakia"], score: 75, fact: "Ibu kotanya, Bratislava, adalah satu-satunya ibu kota di dunia yang berbatasan langsung dengan dua negara merdeka sekaligus (Austria dan Hungaria)." },
      { name: "Slovenia", aliases: [], score: 77, fact: "Memiliki Gua Postojna tempat hidupnya Olm (Proteus), amfibi gua buta yang dijuluki 'Bayi Naga' dan bisa hidup hingga 100 tahun!" },
      { name: "Estonia", aliases: [], score: 78, fact: "Negara paling digital di dunia: warganya bisa memilih dalam pemilu secara online dari rumah sejak tahun 2005!" },
      { name: "Latvia", aliases: [], score: 80, fact: "Memiliki air terjun terlebar di Eropa (Ventas Rumba, lebar 249 meter) meskipun tingginya hanya 2 meter." },
      { name: "Lituania", aliases: ["lithuania"], score: 81, fact: "Bahasa Lituania adalah salah satu bahasa Indo-Eropa tertua yang masih hidup dan memiliki banyak kemiripan tata bahasa dengan bahasa Sanskerta!" },
      { name: "Luksemburg", aliases: ["luxembourg"], score: 76, fact: "Negara pertama di dunia yang menggratiskan seluruh transportasi umum (kereta, trem, dan bus) di seluruh wilayah negaranya sejak tahun 2020!" },
      { name: "Belarus", aliases: ["belarusia"], score: 79, fact: "Menjaga Hutan Purba Białowieża, rumah bagi Bison Eropa (Zubr), mamalia darat terberat di Eropa." },
      { name: "Albania", aliases: [], score: 83, fact: "Dalam bahasanya sendiri, orang Albania menyebut negara mereka 'Shqipëria' yang berarti 'Tanah Burung Elang'." },
      { name: "Bosnia dan Herzegovina", aliases: ["bosnia", "herzegovina"], score: 82, fact: "Memiliki hutan perawan Perućica dan garis pantai terpendek kedua di dunia (hanya 20 km di kota Neum)." },

      // LEGENDA PALUNG
      { name: "San Marino", aliases: [], score: 92, fact: "Didirikan pada tanggal 3 September 301 Masehi oleh seorang pemahat batu, menjadikannya republik konstitusional tertua di dunia yang masih berdiri!" },
      { name: "Andorra", aliases: [], score: 94, fact: "Negara pegunungan Pyrenees antara Prancis dan Spanyol yang merupakan satu-satunya negara di dunia dengan bahasa resmi Katalan." },
      { name: "Liechtenstein", aliases: [], score: 96, fact: "Negara mikro makmur di Pegunungan Alpen yang tidak memiliki bandara dan menjadi produsen gigi palsu terbesar di dunia!" },
      { name: "Malta", aliases: [], score: 91, fact: "Memiliki kuil megalitik Ġgantija yang dibangun sekitar tahun 3600 SM—lebih tua daripada Piramida Mesir maupun Stonehenge!" },
      { name: "Moldova", aliases: ["montenegro", "makedonia utara", "macedonia"], score: 95, fact: "Memiliki ruang penyimpanan bawah tanah Mileștii Mici yang berupa jaringan terowongan batu kapur sepanjang 200 kilometer (bisa dilalui mobil di bawah tanah!)." }
    ]
  }
];

const { EXTRA_CATEGORIES } = require("./extraCategories");
const ALL_CATEGORIES = [...CATEGORIES, ...EXTRA_CATEGORIES];

module.exports = { CATEGORIES: ALL_CATEGORIES };
