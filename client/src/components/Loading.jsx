import React from "react";
import BlurCircle from "./BlurCircle";

const Loading = () => {
  return (
    <div className="flex justify-center items-center h-[80vh]">
      <BlurCircle top="100px" left="-100px" />
      <BlurCircle bottom="100px" right="0px" />

      <div className="animate-spin rounded-full h-14 w-14 border-2 border-t-primary"></div>
    </div>
  );
};

export default Loading;
