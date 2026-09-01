// ==========================================================
// ระบบแชทแบบ Direct User Chat
// ==========================================================

let currentUser = null;


// ==========================================================
// โหลดรายชื่อผู้ใช้ที่เคยแชทด้วย
// ==========================================================

async function loadChatContacts() {

    if (!requireLogin()) return;

    const list = document.getElementById("conversationList");

    if (!list) return;

    list.innerHTML =
        '<p class="text-muted-sm">กำลังโหลด...</p>';

    try {

        const myId = Number(getCurrentUserId());

        const { data: contacts } =
            await api.get(`/chat-contacts/${myId}`);

        if (!contacts || contacts.length === 0) {

            list.innerHTML =
                '<p class="text-muted-sm">ยังไม่มีบทสนทนา</p>';

            document.getElementById("chatWithLabel").textContent = "";
            document.getElementById("chatMessages").innerHTML = "";

            currentUser = null;

            return;
        }

        list.innerHTML = contacts.map(user => {

            const userName =
                `${user.first_name} ${user.last_name}`;

            return `
                <div
                    class="conversation-item"
                    onclick="openDirectChat(
                        ${Number(user.id)},
                        '${escapeHtml(userName)}'
                    )"
                >
                    <strong>
                        คุณ${escapeHtml(userName)}
                    </strong>
                </div>
            `;

        }).join("");

        // ถ้ายังไม่ได้เลือกใคร ให้เปิดคนแรก
        if (!currentUser) {

            openDirectChat(
                Number(contacts[0].id),
                `${contacts[0].first_name} ${contacts[0].last_name}`
            );

        }

    } catch (err) {

        console.error(
            "Load Chat Contacts Error:",
            err
        );

        list.innerHTML =
            `<p class="text-muted-sm">
                โหลดแชทไม่สำเร็จ: ${escapeHtml(err.message)}
            </p>`;
    }
}


// ==========================================================
// เปิดแชทกับ User
// ==========================================================

async function openDirectChat(userId, userName) {

    currentUser = Number(userId);

    document.getElementById("chatWithLabel").textContent =
        "กำลังแชทกับ : " + userName;

    await loadMessages();
}


// ==========================================================
// เริ่มแชทจากโพสต์
// ==========================================================

async function startConversation(
    postId,
    otherUserId,
    otherUserName
) {

    if (!requireLogin()) return;

    const myId = Number(getCurrentUserId());

    if (myId === Number(otherUserId)) {

        alert("ไม่สามารถแชทกับตัวเองได้");

        return;
    }

    currentUser = Number(otherUserId);

    switchTab("chat");

    document.getElementById("chatWithLabel").textContent =
        "กำลังแชทกับ : " + otherUserName;

    await loadMessages();
}


// ==========================================================
// โหลดข้อความของ User 2 คน
// ==========================================================

async function loadMessages() {

    if (!currentUser) return;

    const box =
        document.getElementById("chatMessages");

    if (!box) return;

    box.innerHTML =
        '<p class="text-muted-sm">กำลังโหลด...</p>';

    try {

        const myId =
            Number(getCurrentUserId());

        const otherId =
            Number(currentUser);

        const { data: messages } =
            await api.get(
                `/messages/${myId}/${otherId}`
            );

        renderMessages(messages);

    } catch (err) {

        console.error(
            "Load Messages Error:",
            err
        );

        box.innerHTML =
            `<p class="text-muted-sm">
                โหลดข้อความไม่สำเร็จ:
                ${escapeHtml(err.message)}
            </p>`;
    }
}


// ==========================================================
// แสดงข้อความ
// ==========================================================

function renderMessages(messages) {

    const box =
        document.getElementById("chatMessages");

    const myId =
        Number(getCurrentUserId());

    box.innerHTML = "";

    if (!messages || messages.length === 0) {

        box.innerHTML =
            '<p class="text-muted-sm">ยังไม่มีข้อความ</p>';

        return;
    }

    messages.forEach(msg => {

        const div =
            document.createElement("div");

        div.className =
            Number(msg.sender_id) === myId
                ? "chat-bubble chat-bubble-mine"
                : "chat-bubble chat-bubble-theirs";

        div.textContent = msg.message;

        box.appendChild(div);

    });

    box.scrollTop = box.scrollHeight;
}


// ==========================================================
// ส่งข้อความ
// ==========================================================

async function sendChatMessage(e) {

    e.preventDefault();

    if (!requireLogin()) return;

    if (!currentUser) {

        alert("กรุณาเลือกผู้ที่ต้องการแชท");

        return;
    }

    const input =
        document.getElementById("chatInput");

    const text =
        input.value.trim();

    if (!text) return;

    try {

        const myId =
            Number(getCurrentUserId());

        await api.post("/messages", {

            sender_id: myId,

            receiver_id: Number(currentUser),

            message: text

        });

        input.value = "";

        await loadMessages();

        // รีเฟรชรายชื่อเพื่อเรียงตามข้อความล่าสุด
        await loadChatContacts();

    } catch (err) {

        console.error(
            "Send Message Error:",
            err
        );

        alert(
            "ส่งข้อความไม่สำเร็จ: " +
            err.message
        );
    }
}