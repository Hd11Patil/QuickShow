import axios from "axios";
import "dotenv/config";
import Movie from "../models/Movie.js";

// API to get now playing movies from TMDB API

export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );

    const movies = data.results;
    res.json({ success: true, movies: movies });
  } catch (error) {
    console.error("Error fetching now playing movies:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to add a new show to the database

export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      // Fetch movie details and credits from TMDB API
      //time  5:37:59
    }
  } catch (error) {
    console.error("Error adding new show:", error);
    res.json({ success: false, message: error.message });
  }
};
