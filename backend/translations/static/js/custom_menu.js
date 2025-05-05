// custom_menu.js - Script corregido sin redundancias
document.addEventListener('DOMContentLoaded', function() {
    // Limpiar menú actual
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    // Guardar sólo el logo y elementos de usuario
    const brandContainer = sidebar.querySelector('.brand-link');
    const userPanel = sidebar.querySelector('.user-panel');
    
    // Limpiar el sidebar
    sidebar.innerHTML = '';
    
    // Reañadir el logo y panel de usuario
    if (brandContainer) sidebar.appendChild(brandContainer);
    if (userPanel) sidebar.appendChild(userPanel);
    
    // Crear menú personalizado CORREGIDO SIN REDUNDANCIAS
    const menuStructure = [
        {
            title: null,  // Sin título para el dashboard
            icon: "fas fa-tachometer-alt",
            text: "Panel",
            url: "/admin/"
        },
        {
            title: "CONTENIDO",  // Título en mayúsculas para la sección
            icon: "fas fa-book",
            items: [
                { icon: "fas fa-language", text: "Traducciones", url: "/admin/translations/objecttranslation/" },
                { icon: "fas fa-tasks", text: "Ejercicios", url: "/admin/translations/exercise/" }
            ]
        },
        {
            title: "USUARIOS",
            icon: "fas fa-users",
            items: [
                { icon: "fas fa-user", text: "Cuentas", url: "/admin/auth/user/" },
                { icon: "fas fa-id-card", text: "Perfiles", url: "/admin/translations/userprofile/" },
                { icon: "fas fa-users-cog", text: "Grupos", url: "/admin/auth/group/" }
            ]
        },
        {
            title: "PROGRESO",
            icon: "fas fa-chart-line",
            items: [
                { icon: "fas fa-chart-line", text: "Progresos", url: "/admin/translations/userprogress/" },
                { icon: "fas fa-folder", text: "Categorías", url: "/admin/translations/progresscategory/" },
                { icon: "fas fa-stopwatch", text: "Sesiones", url: "/admin/translations/practicesession/" }
            ]
        },
        {
            title: "GAMIFICACIÓN",
            icon: "fas fa-trophy",
            items: [
                { icon: "fas fa-medal", text: "Logros", url: "/admin/translations/achievement/" },
                { icon: "fas fa-fire", text: "Recompensas", url: "/admin/translations/streakreward/" }
            ]
        },
        {
            title: "ACTIVIDAD",
            icon: "fas fa-history",
            items: [
                { icon: "fas fa-history", text: "Registros", url: "/admin/translations/activitylog/" }
            ]
        },
        {
            title: "PRONUNCIACIÓN",
            icon: "fas fa-microphone",
            items: [
                { icon: "fas fa-headphones", text: "Grabaciones", url: "/admin/translations/pronunciationrecord/" }
            ]
        }
    ];

    // Crear nav container
    const navContainer = document.createElement('nav');
    navContainer.className = 'mt-2';
    sidebar.appendChild(navContainer);
    
    const navUl = document.createElement('ul');
    navUl.className = 'nav nav-pills nav-sidebar flex-column';
    navUl.setAttribute('data-widget', 'treeview');
    navUl.setAttribute('role', 'menu');
    navUl.setAttribute('data-accordion', 'false');
    navContainer.appendChild(navUl);
    
    // Crear elementos del menú
    menuStructure.forEach(section => {
        // Si tiene items, crear un grupo con título y subelementos
        if (section.items && section.items.length > 0) {
            // Primero, agregar el encabezado de sección
            const titleDiv = document.createElement('div');
            titleDiv.className = 'nav-header mt-3';
            titleDiv.textContent = section.title;
            titleDiv.style.fontWeight = 'bold';
            titleDiv.style.fontSize = '12px';
            titleDiv.style.padding = '0.5rem 1rem';
            titleDiv.style.color = 'rgba(255,255,255,0.5)';
            navUl.appendChild(titleDiv);
            
            // Luego agregar los items de la sección (sin redundancia)
            section.items.forEach(item => {
                const subLi = document.createElement('li');
                subLi.className = 'nav-item';
                
                const subA = document.createElement('a');
                subA.href = item.url;
                subA.className = 'nav-link';
                
                const subIcon = document.createElement('i');
                subIcon.className = item.icon + ' nav-icon';
                subA.appendChild(subIcon);
                
                const subP = document.createElement('p');
                subP.textContent = item.text;
                subA.appendChild(subP);
                
                subLi.appendChild(subA);
                navUl.appendChild(subLi);
            });
        } else {
            // Si no tiene items, es un elemento individual (como el dashboard)
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const a = document.createElement('a');
            a.href = section.url;
            a.className = 'nav-link';
            
            const icon = document.createElement('i');
            icon.className = section.icon + ' nav-icon';
            a.appendChild(icon);
            
            const p = document.createElement('p');
            p.textContent = section.text;
            a.appendChild(p);
            
            li.appendChild(a);
            navUl.appendChild(li);
        }
    });
    
    // Marcar la página actual como activa
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
            
            // Activar también si es una subpágina
            if (currentPath.includes('/change/') || currentPath.includes('/add/')) {
                const baseUrl = currentPath.split('/').slice(0, 4).join('/') + '/';
                if (link.getAttribute('href') === baseUrl) {
                    link.classList.add('active');
                }
            }
        }
    });
});