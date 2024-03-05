import { asyncHandler } from "../utils/asyncHandler"

const toggleCommentLike = asyncHandler(async(req,res)=>{
    const{commentID} = req.params
})
const toggleTweetLike = asyncHandler(async(req,res)=>{
    const{tweetID} = req.params
})
const toggleVideoLike = asyncHandler(async(req,res)=>{
    const{videoID} = req.params
})
const getLikedVideos = asyncHandler(async(req,res)=>{
    
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}