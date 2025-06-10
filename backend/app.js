import { config } from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { connection } from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./router/userRoutes.js";
import auctionItemRouter from "./router/auctionItemRoutes.js";
import bidRouter from "./router/bidRoutes.js";
import commissionRouter from "./router/commissionRouter.js";
import superAdminRouter from "./router/superAdminRoutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { verifyCommissionCron } from "./automation/verifyCommissionCron.js";
import { User } from "./models/userSchema.js";
import nodemailer from "nodemailer";

const app = express();

config();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);
app.post('/api/v1/contact', async (req, res) => {
  const { message, name, email, phone } = req.body;
  

  try {

   


    const adminEmails = await User.find({ role: "Super Admin" }).distinct('email');

    
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_MAIL, 
        pass: process.env.SMTP_PASSWORD  
      }
    });

    // **Mail Options for Admins**
    var mailOptionsAdmin = {
      from: process.env.SMTP_MAIL,
      to: adminEmails.join(','), // Multiple Admin Emails (comma separated)
      subject: 'New Contact Form Submission',
      text: `New contact form submission received!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
    };

    // **Send Email to Admins**
    transporter.sendMail(mailOptionsAdmin, function (error, info) {
      if (error) {
        console.log('Error sending email to admins:', error);
      } else {
        console.log('Email sent to admins:', info.response);
      }
    });

    // **Email to User (Confirmation)**
    var mailOptionsUser = {
      from: process.env.SMTP_MAIL,
      to: email, // User's email
      subject: 'We Received Your Message',
      text: `Hello ${name},\n\nThank you for reaching out. We received your message:\n"${message}"\n\nOur team will get back to you shortly.\n\nBest regards,\nTeam`
    };

    // **Send Confirmation Email to User**
    transporter.sendMail(mailOptionsUser, function (error, info) {
      if (error) {
        console.log('Error sending email to user:', error);
      } else {
        console.log('Confirmation email sent to user:', info.response);
      }
    });

    return res.status(200).json('Message received & emails sent!');
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json('Error saving contact form');
  }
});
endedAuctionCron();
verifyCommissionCron();
connection();
app.use(errorMiddleware);

export default app;
