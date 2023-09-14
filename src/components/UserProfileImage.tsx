import { NextPage } from "next";
import Image from "next/image";
import { useState } from "react";

export const UserProfileImage: NextPage<{
  userId: string;
  width?: number;
  height?: number;
}> = ({ userId, width = 40, height = 40 }) => {
  const [src, setSrc] = useState<string>(userId);

  return (
    <Image
      width={width}
      height={height}
      // loader={userProfileImageLoader}
      src={src}
      // onError={(e) => {
      //   e.currentTarget.onerror = null;
      //   setSrc(USER_DEFAULT_IMAGE_SRC);
      // }}
      alt="User profile image"
    />
  );
};
