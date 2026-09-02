// ==========================================================
// Floating Action Button - ลากปุ่ม + เมนูตามกัน
// ==========================================================

const fabButton = document.getElementById("fabButton");
const fabMenu = document.getElementById("fabMenu");

let isDraggingFab = false;
let fabStartX = 0;
let fabStartY = 0;
let fabStartLeft = 0;
let fabStartTop = 0;
let fabMoved = false;

fabButton.addEventListener("pointerdown", (e) => {

    isDraggingFab = true;
    fabMoved = false;

    fabButton.setPointerCapture(e.pointerId);

    const rect = fabButton.getBoundingClientRect();

    fabStartX = e.clientX;
    fabStartY = e.clientY;

    fabStartLeft = rect.left;
    fabStartTop = rect.top;

    // เปลี่ยนจาก right/bottom เป็น left/top
    fabButton.style.left = rect.left + "px";
    fabButton.style.top = rect.top + "px";
    fabButton.style.right = "auto";
    fabButton.style.bottom = "auto";
});

fabButton.addEventListener("pointermove", (e) => {

    if (!isDraggingFab) return;

    const dx = e.clientX - fabStartX;
    const dy = e.clientY - fabStartY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        fabMoved = true;
    }

    let newLeft = fabStartLeft + dx;
    let newTop = fabStartTop + dy;

    // กันไม่ให้ปุ่มออกนอกหน้าจอ
    const maxLeft = window.innerWidth - fabButton.offsetWidth;
    const maxTop = window.innerHeight - fabButton.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    fabButton.style.left = newLeft + "px";
    fabButton.style.top = newTop + "px";

    // ======================================================
    // ให้เมนูตามปุ่ม
    // ======================================================

    if (fabMenu) {

        const menuRect = fabMenu.getBoundingClientRect();

        // ตำแหน่งกึ่งกลางของปุ่ม
        const fabCenterX =
            newLeft + fabButton.offsetWidth / 2;

        // ให้เมนูอยู่เหนือปุ่ม
        let menuLeft =
            fabCenterX - menuRect.width / 2;

        let menuTop =
            newTop - menuRect.height - 12;

        // กันเมนูออกซ้าย/ขวา
        menuLeft = Math.max(
            8,
            Math.min(
                menuLeft,
                window.innerWidth - menuRect.width - 8
            )
        );

        // ถ้าเมนูชนด้านบน ให้ไปอยู่ใต้ปุ่ม
        if (menuTop < 8) {
            menuTop =
                newTop + fabButton.offsetHeight + 12;
        }

        fabMenu.style.left = menuLeft + "px";
        fabMenu.style.top = menuTop + "px";
        fabMenu.style.right = "auto";
        fabMenu.style.bottom = "auto";
    }
});

fabButton.addEventListener("pointerup", (e) => {

    isDraggingFab = false;

    fabButton.releasePointerCapture(e.pointerId);
});

// ป้องกันการเปิดเมนูหลังจากลาก
fabButton.addEventListener("click", (e) => {

    if (fabMoved) {

        e.preventDefault();
        e.stopPropagation();

        fabMoved = false;
    }
});