import React from 'react';
import { View, Text, Image } from 'react-native';

const PostItem = ({ post }) => (
  <View>
    <Text>{post.userId.username}: {post.content}</Text>
    {post.mediaUrl && <Image source={{ uri: post.mediaUrl }} style={{ width: 200, height: 200 }} />}
  </View>
);

export default PostItem;