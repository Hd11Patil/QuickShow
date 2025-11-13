import express from "express";
import { getNowPlayingMovies } from "../controllers/showControllers.js";

const showRouter = express.Router();

showRouter.get("/now-playing", getNowPlayingMovies);

export default showRouter;
