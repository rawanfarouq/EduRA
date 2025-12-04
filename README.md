# EduRA: A Modern E-Learning & Tutor Matching Platform

EduRA is a MERN-stack web application that connects **students**, **tutors**, and **admins** in one integrated platform.  
It supports course discovery, tutor assignment, booking, resource sharing, and admin management in an organized, user-friendly way.

🔗 **Deployed App (Client):** https://edura-client.onrender.com/

---

## Motivation

This project started as an academic & portfolio project to learn and apply the **MERN Stack** (MongoDB, Express.js, React.js, Node.js) in a real, production-style web app.

While building EduRA, the focus was not only on backend logic, but also on:

- Designing a **realistic e-learning platform** that could be used by real users one day.
- Implementing **role-based flows** (Student / Tutor / Admin).
- Practicing modern **UI/UX** so that users would *want* to come back and recommend the platform to others.
- Deploying the project so it is publicly accessible and testable.

---

## Build Status

- The project is **currently under active development**.
- The **client** is deployed on Render’s free tier → can be a bit slow on first load (“cold start”).
- Backend runs on free-tier infra → may experience slow response or brief cold starts.
- Unit/integration tests are still under development (Postman is currently used for interactive API testing).
- UI/UX and responsiveness are continuously being improved.

---

## Code Style

- Standard JavaScript & TypeScript-friendly conventions.
- Variable naming:  
  - `camelCase` for variables and functions.  
  - `PascalCase` for React components and Mongoose models.
- All related routes for a certain resource are grouped in the same route file (e.g. `courses.routes.js`, `auth.routes.js`).
- All related controllers for a resource are grouped in a single controller file (e.g. `courseController.js`).
- Reusable frontend components (buttons, cards, layouts) are placed under `client/src/components`.
- Inline styling is kept minimal; layout is handled with **TailwindCSS / CSS classes** whenever possible.

---

## Screenshots

#### Home Page
<img width="1895" height="912" alt="image" src="https://github.com/user-attachments/assets/8ee8147b-39a5-4003-a416-5dff4a73a2f5" />
<img width="1895" height="911" alt="image" src="https://github.com/user-attachments/assets/c72aff0d-4563-449b-a6cf-f5eb2eccf7eb" />
<img width="1888" height="913" alt="image" src="https://github.com/user-attachments/assets/42966741-7865-4aa6-97c2-f41c8355dbfd" />
<img width="1876" height="903" alt="image" src="https://github.com/user-attachments/assets/ac12a872-d412-4b33-bb8b-069998abd345" />



#### Register Page
<img width="1882" height="911" alt="image" src="https://github.com/user-attachments/assets/4444484b-7483-4f74-a823-bbe6fea591ff" />


#### Register Tutor Page
<img width="1850" height="909" alt="image" src="https://github.com/user-attachments/assets/f98efd77-4cbc-4bc3-a9d3-6a18ff79530b" />
<img width="1879" height="907" alt="image" src="https://github.com/user-attachments/assets/bcda66f5-55c5-4af2-8d5f-04ed2df97d20" />

#### Register Student Page
<img width="1880" height="906" alt="image" src="https://github.com/user-attachments/assets/dc47c9b8-22cf-413f-994e-2271fa879e7d" />



#### Login Page
<img width="1892" height="913" alt="image" src="https://github.com/user-attachments/assets/e764386d-86d2-448f-b550-cb222d7d254b" />



#### Student Dashboard
<img width="1893" height="906" alt="image" src="https://github.com/user-attachments/assets/0fb88584-95a6-4aed-80d8-697ed28ed8c5" />
<img width="1884" height="913" alt="image" src="https://github.com/user-attachments/assets/219696af-a68c-4a4e-a10c-3e8705d8d2f6" />



#### Tutor Dashboard
<img width="1857" height="910" alt="image" src="https://github.com/user-attachments/assets/5837d556-5237-4db3-a180-0bd5119bfc66" />
<img width="1905" height="894" alt="image" src="https://github.com/user-attachments/assets/c8ee91d2-ac50-4b0c-a776-23343cfd6e4d" />
<img width="1881" height="910" alt="image" src="https://github.com/user-attachments/assets/3bd181f8-8ed9-41d1-95a5-d6840187559a" />
<img width="1885" height="913" alt="image" src="https://github.com/user-attachments/assets/ad718560-fed4-470d-bfef-a608248eccb1" />
<img width="1876" height="909" alt="image" src="https://github.com/user-attachments/assets/04128ebb-f680-4041-b7cb-689ab7ae1b12" />



#### Admin Dashboard
<img width="1893" height="915" alt="image" src="https://github.com/user-attachments/assets/cc8a4908-1811-421f-830f-80d595decbce" />
<img width="1896" height="906" alt="image" src="https://github.com/user-attachments/assets/85efa559-0696-4e77-b15d-70e80a879de2" />
<img width="1871" height="906" alt="image" src="https://github.com/user-attachments/assets/91c3d134-eb17-4a66-81f7-ef461af4495a" />
<img width="1896" height="907" alt="image" src="https://github.com/user-attachments/assets/6c33ca83-e66c-4257-b67a-335153495e4c" />



#### Course Details
<img width="1559" height="852" alt="image" src="https://github.com/user-attachments/assets/40c3f4dd-4e65-41d4-a288-c15f40c405bc" />
<img width="833" height="772" alt="image" src="https://github.com/user-attachments/assets/a667e372-8d5e-4cbc-bf9e-ec441eba395e" />
<img width="820" height="685" alt="image" src="https://github.com/user-attachments/assets/d60afdf5-2db9-4307-b09d-a43ce397da33" />


---

## Tech / Framework Used

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [TailwindCSS](https://tailwindcss.com/) (and/or Bootstrap depending on final setup)
- [Node.js](https://nodejs.org/en/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [JSON Web Token (JWT)](https://jwt.io/)
- [OpenAI API](https://platform.openai.com/) (for tutor CV → course matching)
- [Git](https://git-scm.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Postman](https://www.postman.com/)
- [VSCode](https://code.visualstudio.com/)
- [Render](https://render.com/) (deployment)

---


## Installation
- Install VS Code
 - Install Node.js
 - Install Git
 - (Recommended) Install some global tools:
   -npm install -g nodemon
 - Then clone and set up the project:
    - git clone https://github.com/YOUR_USERNAME/EduRA.git
    - cd EduRA

## Features

### The system serves different types of users (Guest, Student, Tutor & Admin)

---

### As a Guest I can

- Visit the **landing page** and browse high-level info about EduRA.
- View public **course categories** and limited course info.
- Access **About / Contact** sections.
- Use the contact form (mailto) to send an email to the EduRA team.
- Register as a **Student**.
- Register as a **Tutor candidate** (submit tutor profile / CV).
- Log in with an existing account.

---

### As a Student I can

- Sign in and access a **personal dashboard**.
- View available **course categories** and **courses**.
- See **assigned tutor information** for a course (if any).
- Send **booking requests** for a course (e.g. “I want tutoring in Course X”).
- View **status** of my booking requests (pending / approved / rejected).
- See **resources / links** shared by assigned tutors.
- Receive **notifications** (e.g. booking accepted, course updated).
- Update my basic profile details (name, contact info, etc.).

---

### As a Tutor I can

- Sign in to a dedicated **Tutor Dashboard**.
- View **courses** assigned to me by the admin.
- Benefit from **AI-powered course matching**: the system uses **OpenAI embeddings** to suggest the most suitable courses for me based on my CV and expertise.
- View **booking requests** from students related to my courses.
- Accept or reject **tutor-specific requests** if applicable.
- Add **course resources** (links, documents, videos) for students:
  - e.g. adding a YouTube link, Google Drive material, or article link.
- See an overview of my **students** and their enrolled courses.
- Update my tutor **profile / CV / expertise**.


---

### As an Admin I can

- Log in to an **Admin Dashboard**.
- Manage **users**:
  - View all students and tutors.
  - Approve or reject tutor applications.
- Manage **courses & categories**:
  - Create / edit / delete course categories.
  - Create / edit / archive courses.
  - Assign tutors to courses.
- Manage **booking requests**:
  - View all student booking requests.
  - Approve or decline bookings.
- View, moderate and manage **tutor resources** and links.
- Optionally view **AI-based tutor suggestions** for each course (based on CV matching).

---

## Usage / Examples

Below are a few representative code snippets from the backend to show how some core logic is organized.

---

#### Code Example – `authController.js` (Login)

```javascript
// server/src/controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createAccessToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: "15m" });

const createRefreshToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

export const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password +role");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user._id, user.role);
    const refreshToken = createRefreshToken(user._id, user.role);

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred while logging in." });
  }
};
