import { asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens");
    }
}

const registerUser = asyncHandler( async (req,res) => {
   const {fullName,email,username,password} = req.body;
//    console.log("email: ",email);
   if(
    [fullName,email,password,username].some((field) => field?.trim() === "" )
    ){
        throw new ApiError(400,"all fields are required")
    }

    const excitedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(excitedUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})

const loginUser = asyncHandler(async (req,res) => {
    const {email,password,username} = req.body;
    // console.log(email);

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

   const user = await User.findOne({
        $or : [{username},{email}] 
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }
    // console.log(password);
   const isPasswordValid = await user.isPasswordCorrect(password)
//    console.log(isPasswordValid);
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials");
   }

   const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);
//    console.log(refreshToken);
//    console.log(accessToken);
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
    httpOnly : true,
    secure: true, 
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,refreshToken,
        },
        "user logged in successfully"
    )
   )
})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.body._id,
        {
            $set:{
                refreshToken:1,
            }
            },
            {
                new:true,
            },
        
    )
    const options = {
        httpOnly : true,
        secure: true, 
       }
    
       return res
       .status(200)
       .clearCookie("accessToken",options)
       .clearCookie("refreshToken",options)
       .json(
        new ApiResponse(
            200,
            {},
            "user logged out"
        )
       )
})

export  {
    registerUser,
    loginUser,
    logoutUser
};