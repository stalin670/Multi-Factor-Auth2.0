import bcrypt from "bcryptjs";
import User from "../models/user.js";
import speakeasy from "speakeasy";
import qrCode from "qrcode";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      isMfaActive: false,
    });

    console.log("New User : ", newUser);
    await newUser.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error registering user", message: error });
  }
};
export const login = async (req, res) => {
  console.log("The authenticated user is : ", req.user);
  return res.status(200).json({
    message: "User logged in successfully",
    username: req.user.username,
    isMfaActive: req.user.isMfaActive,
  });
};
export const authStatus = async (req, res) => {
  if (req.user) {
    return res.status(200).json({
      message: "User logged in successfully",
      username: req.user.username,
      isMfaActive: req.user.isMfaActive,
    });
  } else {
    return res.status(401).json({ message: "Unauthorized user" });
  }
};
export const logout = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized user" });
  }
  req.logout((err) => {
    if (err) return res.status(400).json({ message: "User not logged In" });
    return res.status(200).json({ message: "User Logout successfully" });
  });
};
export const setup2FA = async (req, res) => {
  try {
    console.log("The req.user is : ", req.user);
    const user = req.user;
    var secret = speakeasy.generateSecret();
    user.twoFactorSecret = secret.base32;
    user.isMfaActive = true;
    await user.save();
    const url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `${req.user.username}`,
      issuer: "amityadav.com",
      encoding: "base32",
    });
    const qrImageUrl = await qrCode.toDataURL(url);
    return res.status(200).json({
      secret: secret.base32,
      qrCode: qrImageUrl,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error setting up 2FA", message: error });
  }
};
export const verify2FA = async (req, res) => {
  const { token } = req.body;
  const user = req.user;

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  });

  if (verified) {
    const jwtToken = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1hr",
      }
    );

    return res
      .status(200)
      .json({ message: "2FA successfull", token: jwtToken });
  } else {
    return res.status(400).json({ message: "Invalid 2FA token" });
  }
};
export const reset2FA = async (req, res) => {
  try {
    const user = req.user;
    user.twoFactorSecret = "";
    user.isMfaActive = false;
    await user.save();
    return res.status(200).json({ message: "2FA reset successfull" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error reseting 2FA", message: error });
  }
};
